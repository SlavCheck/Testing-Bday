const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const introScene =
    require("./game/scenes/intro");

const PORT = 3000;
const path = require("path");


// --------------------------------------------------
// STATIC FILES
// --------------------------------------------------

app.use(express.static("public"));


// --------------------------------------------------
// GAME STATE
// --------------------------------------------------

const games = new Map();


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function startSceneTimer(game, duration) {

    if (!duration) {
        game.sceneTimer = null;
        return;
    }

    // Отменяем предыдущий таймер
    if (game.sceneTimerTimeout) {
        clearTimeout(game.sceneTimerTimeout);
    }

    const endsAt =
        Date.now() + duration * 1000;

    game.sceneTimer = {
        duration,
        endsAt
    };

    io.to(`game_${game.id}`).emit(
        "scene:timer",
        {
            duration,
            endsAt
        }
    );

    game.sceneTimerTimeout =
        setTimeout(() => {

            // Если за это время сцена уже сменилась —
            // ничего не делаем
            if (
                !game.currentScene ||
                !game.sceneTimer ||
                game.sceneTimer.endsAt !== endsAt
            ) {
                return;
            }

            console.log(
                `Таймер сцены "${game.currentScene.id}" закончился`
            );

            game.sceneTimer = null;

            // Если активно голосование,
            // его таймер сам завершит голосование.
            if (
                game.voting &&
                game.voting.active
            ) {
                return;
            }

            moveToNextScene(game);

        }, duration * 1000);
}

function generateGameCode() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (let i = 0; i < 5; i++) {

            const index =
                Math.floor(Math.random() * chars.length);

            code += chars[index];
        }

    } while (games.has(code));

    return code;
}


function broadcastLobbyUpdate(game) {

    const players =
        [...game.players.values()].map(player => ({
            id: player.id,
            nickname: player.nickname,
            team: player.team
        }));

    io.to(`game_${game.id}`).emit(
        "lobby:update",
        {
            gameId: game.id,
            status: game.status,
            players
        }
    );
}

function startSceneVoting(game, scene) {

    if (!scene.voting || !scene.voting.enabled) {
        return;
    }

    const duration =
        scene.voting.duration || 30;

        for (
            const player of
            game.players.values()
        ) {
        
            player.currentChoice =
                null;
        
        }
    
    game.voting = {
        active: true,

        choices: new Map(),

        endsAt:
            Date.now() +
            duration * 1000,

        round: 1
    };

    console.log(
        `Голосование началось: ${game.id} / ${scene.id}`
    );

    io.to(
        `game_${game.id}`
    ).emit(
        "voting:started",
        {
            duration,
            endsAt: game.voting.endsAt,
            round: 1
        }
    );

    setTimeout(
        () => {

            finishSceneVoting(
                game,
                scene
            );

        },
        duration * 1000
    );
}

function awardVotingPoints(game, scene, winner) {

    const winningChoice =
        scene.choices.find(
            choice =>
                choice.id === winner
        );


    if (!winningChoice) {

        console.error(
            `Не найден победивший вариант: ${winner}`
        );

        return;
    }


    console.log(
        `Начисляем очки за вариант: ${winner}`
    );


    for (
        const player of game.players.values()
    ) {

        // Игрок не сделал выбор

        if (!player.currentChoice) {

            console.log(
                `Игрок ${player.nickname} ` +
                `не голосовал. Очки не начисляются.`
            );

            continue;
        }


        let points;


        // Игрок выбрал победивший вариант

        if (
            player.currentChoice === winner
        ) {

            if (
                player.team ===
                winningChoice.team
            ) {

                points =
                    winningChoice.points.ownTeam;

            } else {

                points =
                    winningChoice.points.otherTeam;

            }

        } else {

            // Игрок выбрал проигравший вариант

            points = 0;

        }


        player.score += points;


        console.log(
            `Игрок ${player.nickname}: ` +
            `+${points} очков. ` +
            `Всего: ${player.score}`
        );
    }
}

/**
 * Перевести игру на следующую сцену.
 * Если у текущей сцены указано поле `nextSceneId`,
 * загружаем соответствующий модуль из папки game/scenes,
 * меняем `game.currentScene`, очищаем состояние голосования
 * и рассылаем клиентам событие `game:started`.
 * При отсутствии следующей сцены игра считается завершённой.
 */
/**
 * Перевести игру на следующую сцену.
 *
 * Приоритет:
 * 1. game.nextSceneId — переход, выбранный победившим вариантом
 * 2. game.currentScene.nextSceneId — общий переход сцены
 * 3. если ничего нет — игра завершена
 */
function moveToNextScene(game) {

    if (game.sceneTimerTimeout) {
        clearTimeout(game.sceneTimerTimeout);
        game.sceneTimerTimeout = null;
    }
    // --------------------------------------------------
    // ОПРЕДЕЛЯЕМ СЛЕДУЮЩУЮ СЦЕНУ
    // --------------------------------------------------

        const nextSceneId =
        game.nextSceneId ||
        game.currentScene?.nextSceneId;


    if (!nextSceneId) {

        console.log(
            `Сцена "${game.currentScene?.id ?? "none"}" не имеет следующей сцены — игра завершена.`
        );

        io.to(
            `game_${game.id}`
        ).emit(
            "game:ended"
        );

        return;
    }


    // --------------------------------------------------
    // ПУТЬ К ФАЙЛУ СЦЕНЫ
    // --------------------------------------------------

    const nextScenePath =
        path.join(
            __dirname,
            "game",
            "scenes",
            nextSceneId
        );
    
    delete game.nextSceneId;

    // --------------------------------------------------
    // ЗАГРУЖАЕМ СЦЕНУ
    // --------------------------------------------------

    let nextScene;


    try {

        delete require.cache[
            require.resolve(nextScenePath)
        ];

        nextScene =
            require(nextScenePath);

    } catch (err) {

        console.error(
            `Не удалось загрузить следующую сцену ` +
            `"${nextSceneId}" из ${nextScenePath}:`,
            err
        );

        console.log(
            `Игра остановлена на сцене ` +
            `"${game.currentScene?.id}".`
        );

        return;
    }


    // --------------------------------------------------
    // ЛОГ ПЕРЕХОДА
    // --------------------------------------------------

    console.log(
        `Переходим со сцены ` +
        `"${game.currentScene.id}" ` +
        `на "${nextScene.id}"`
    );


    // --------------------------------------------------
    // МЕНЯЕМ ТЕКУЩУЮ СЦЕНУ
    // --------------------------------------------------

    game.currentScene =
        nextScene;

    // ==================================================
    // ТАЙМЕР СЦЕНЫ
    // ==================================================
    const sceneDuration =
        nextScene.duration || 30;

    startSceneTimer(
        game,
        sceneDuration
    );

        if (nextScene.type === "bug_search") {

            for (const player of game.players.values()) {
        
                player.sceneState = {
        
                    foundBugs: [],
        
                    mistakes: 0,
        
                    answeredCards: [],

                    status: "playing"

                    
        
                };
        
            }
        
        }
    // --------------------------------------------------
    // ОЧИЩАЕМ ПРЕДЫДУЩИЙ ПЕРЕХОД
    // --------------------------------------------------

    delete game.nextSceneId;


    // --------------------------------------------------
    // СБРАСЫВАЕМ ГОЛОСОВАНИЕ
    // --------------------------------------------------

    game.voting = {

        active: false,

        choices: new Map(),

        endsAt: null,

        round: 0,

        allowedChoices: null

    };


    // --------------------------------------------------
    // СБРАСЫВАЕМ ВЫБОР ИГРОКОВ
    // --------------------------------------------------

    for (
        const player of
        game.players.values()
    ) {

        player.currentChoice =
            null;

    }


    // --------------------------------------------------
    // ОТПРАВЛЯЕМ НОВУЮ СЦЕНУ ИГРОКАМ
    // --------------------------------------------------

    io.to(
        `game_${game.id}`
    ).emit(
        "game:started",
        {
            scene: nextScene,
            timer: game.sceneTimer
        }
    );

    // --------------------------------------------------
    // ЗАПУСКАЕМ ГОЛОСОВАНИЕ
    // --------------------------------------------------

    if (
        nextScene.voting &&
        nextScene.voting.enabled
    ) {

        startSceneVoting(
            game,
            nextScene
        );

    }

}



// ---------------------------------------------------------------
// finishSceneVoting – теперь поддерживает revote и переход
// ---------------------------------------------------------------
function finishSceneVoting(game, scene) {
    // Если голосование уже не активно – выходим
    if (!game.voting || !game.voting.active) {
        return;
    }

    // Останавливаем текущий раунд
    game.voting.active = false;

    // ==================================================
    // СПЕЦИАЛЬНАЯ ОБРАБОТКА ВЫБОРА КОМАНДЫ
    // ==================================================

    

    // --------------------- подсчёт голосов ---------------------
    const voteCounts = {};
    for (const choiceId of game.voting.choices.values()) {
        voteCounts[choiceId] = (voteCounts[choiceId] || 0) + 1;
    }
    console.log("Результаты голосования:", voteCounts);

    // --------------------- никто не проголосовал ---------------------
    if (Object.keys(voteCounts).length === 0) {

        console.log("Никто не проголосовал.");
    
        io.to(`game_${game.id}`).emit(
            "voting:finished",
            {
                voteCounts,
                winner: null,
                tie: false
            }
        );
    
        setTimeout(
            () => {
                moveToNextScene(game);
            },
            4000
        );
    
        return;
    }

    // --------------------- ищем победителей ---------------------
    const maxVotes = Math.max(...Object.values(voteCounts));
    const winners = Object.keys(voteCounts).filter(
        id => voteCounts[id] === maxVotes
    );

    // --------------------- ОБРАБОТКА НИЧЬИ ---------------------
    if (winners.length > 1) {
        console.log("Ничья:", winners);

        // Если в сцене указано revote – запускаем его
        if (scene.voting && scene.voting.tieBreak === "revote") {
            const revoteDuration = scene.voting.revoteDuration || 15;
            console.log(`Запускаем revote (длительность ${revoteDuration}s)`);

            // Очищаем прошлый выбор игроков
            for (const player of game.players.values()) {
                player.currentChoice = null;
            }

            // Новый раунд голосования, разрешаем только tiedChoices
            game.voting = {
                active: true,
                choices: new Map(),
                endsAt: Date.now() + revoteDuration * 1000,
                round: (game.voting.round || 1) + 1,
                allowedChoices: new Set(winners)
            };

            // Сообщаем клиентам, что начался revote
            io.to(`game_${game.id}`).emit("voting:revote_started", {
                tiedChoices: winners,
                duration: revoteDuration,
                round: game.voting.round
            });

            // По истечении времени снова вызываем finishSceneVoting
            setTimeout(() => finishSceneVoting(game, scene), revoteDuration * 1000);
            return; // дальше не будем определять победителя сейчас
        }

        // revote НЕ предусмотрен (или уже второй раунд) – выбираем случайного победителя
        // revote НЕ предусмотрен — выбираем случайного победителя
        const randomWinner =
        winners[Math.floor(Math.random() * winners.length)];

        console.log(
        `Случайный победитель: ${randomWinner}`
        );

        awardVotingPoints(
        game,
        scene,
        randomWinner
        );

        // Сохраняем ветвление
        const randomWinningChoice =
        scene.choices.find(
            choice =>
                choice.id === randomWinner
        );

        if (
        randomWinningChoice &&
        randomWinningChoice.nextSceneId
        ) {

        game.nextSceneId =
            randomWinningChoice.nextSceneId;

        } else if (scene.nextSceneId) {

        game.nextSceneId =
            scene.nextSceneId;

        } else {

        delete game.nextSceneId;
        }

        io.to(
        `game_${game.id}`
        ).emit(
        "voting:finished",
        {
            voteCounts,
            winner: randomWinner,
            winnerChoice: randomWinningChoice,
            tie: true
        }
        );

        setTimeout(
        () => {
            moveToNextScene(game);
        },
        5000
        );

        return;
    }

    // ---------- ОДНОЗНАЧНЫЙ ПОБЕДИТЕЛЬ ----------
const winner = winners[0];
console.log(`Победил вариант: ${winner}`);

// Начисляем очки
awardVotingPoints(game, scene, winner);

// ---- Сохраняем ветвление, если оно задано в выбранном варианте ----
const winningChoice = scene.choices.find(c => c.id === winner);
if (winningChoice && winningChoice.nextSceneId) {
    // Запоминаем, что следующая сцена должна быть именно этой
    game.nextSceneId = winningChoice.nextSceneId;
    console.log(`Запланирована ветвленная сцена: ${game.nextSceneId}`);
} else if (scene.nextSceneId) {
    // Если у самой сцены есть fallback‑next (как у intro)
    game.nextSceneId = scene.nextSceneId;
    console.log(`Используем fallback‑next сцены: ${game.nextSceneId}`);
} else {
    delete game.nextSceneId; // ничего не запоминаем – переходим линейно
}

// Оповещаем клиентов о результате голосования
io.to(`game_${game.id}`).emit(
    "voting:finished",
    {
        voteCounts,

        winner,

        winnerChoice: winningChoice,

        tie: false
    }
);

// --------------------------------------------------
// ПАУЗА ДЛЯ TRANSITION
// --------------------------------------------------

setTimeout(
    () => {

        moveToNextScene(game);

    },
    5000
);

return;

}




// --------------------------------------------------
// SOCKET.IO
// --------------------------------------------------

io.on("connection", (socket) => {

    console.log(
        "Подключение:",
        socket.id
    );


    socket.on(
        "bugsearch:card_selected",
        ({ cardId, answer }) => {
    
            if (!socket.gameId) {
                return;
            }
    
            const game =
                games.get(socket.gameId);
    
            if (!game) {
                return;
            }
    
            const scene =
                game.currentScene;
    
            if (
                !scene ||
                scene.type !== "bug_search"
            ) {
                return;
            }
    
            const player =
                [...game.players.values()]
                    .find(
                        player =>
                            player.socketId === socket.id
                    );
    
            if (!player) {
                return;
            }
    
            // ------------------------------------------
            // ПРОВЕРЯЕМ СОСТОЯНИЕ ИГРОКА
            // ------------------------------------------
    
            if (
                !player.sceneState ||
                player.sceneState.status !== "playing"
            ) {
                return;
            }
    
            // ------------------------------------------
            // ПРОВЕРЯЕМ ОТВЕТ
            // ------------------------------------------
    
            if (
                answer !== "bug" &&
                answer !== "no_bug"
            ) {
                console.log(
                    `Некорректный ответ игрока: ${answer}`
                );
    
                return;
            }
    
            // ------------------------------------------
            // ИЩЕМ КАРТОЧКУ
            // ------------------------------------------
    
            const card =
                scene.cards.find(
                    card =>
                        card.id === cardId
                );
    
            if (!card) {
                return;
            }
    
            // ------------------------------------------
            // ПРОВЕРЯЕМ, НЕ ОТВЕЧАЛ ЛИ УЖЕ
            // ------------------------------------------
    
            if (
                player.sceneState.answeredCards &&
                player.sceneState.answeredCards.includes(cardId)
            ) {
                return;
            }
    
            // ------------------------------------------
            // СОЗДАЁМ МАССИВ ОТВЕЧЕННЫХ КАРТОЧЕК
            // ------------------------------------------
    
            if (!player.sceneState.answeredCards) {
    
                player.sceneState.answeredCards = [];
    
            }
    
            player.sceneState.answeredCards.push(
                cardId
            );
    
            // ------------------------------------------
            // ОПРЕДЕЛЯЕМ, ЕСТЬ ЛИ НА КАРТОЧКЕ БАГ
            // ------------------------------------------
    
            const isBug =
                scene.bugs.includes(cardId);
    
            // Правильность ответа:
            //
            // bug + есть баг       = правильно
            // no_bug + нет бага    = правильно
            //
    
            const correct =
                (
                    answer === "bug" &&
                    isBug
                ) ||
                (
                    answer === "no_bug" &&
                    !isBug
                );
    
            console.log(
                `Игрок ${player.nickname}: ` +
                `${cardId} | ` +
                `ответ: ${answer} | ` +
                `баг: ${isBug} | ` +
                `правильно: ${correct}`
            );
    
            // ==================================================
            // НЕПРАВИЛЬНЫЙ ОТВЕТ
            // ==================================================
    
            if (!correct) {
    
                player.sceneState.mistakes++;
    
                console.log(
                    `Игрок ${player.nickname}: ` +
                    `ошибка ${player.sceneState.mistakes}/2`
                );
    
                // ------------------------------------------
                // ВТОРАЯ ОШИБКА
                // ------------------------------------------
    
                if (
                    player.sceneState.mistakes >= 2
                ) {
    
                    player.sceneState.status =
                        "lost";
    
                    socket.emit(
                        "bugsearch:result",
                        {
                            cardId,
    
                            answer,
    
                            correct: false,
    
                            found:
                                player.sceneState.foundBugs.length,
    
                            totalBugs:
                                scene.bugs.length,
    
                            mistakes:
                                player.sceneState.mistakes,
    
                            finished: true,
    
                            result: "lose",
    
                            points: 0
                        }
                    );
    
                    console.log(
                        `Игрок ${player.nickname} ` +
                        `проиграл bug_search`
                    );
    
                    return;
                }
    
                // ------------------------------------------
                // ПЕРВАЯ ОШИБКА
                // ------------------------------------------
    
                socket.emit(
                    "bugsearch:result",
                    {
                        cardId,
    
                        answer,
    
                        correct: false,
    
                        found:
                            player.sceneState.foundBugs.length,
    
                        totalBugs:
                            scene.bugs.length,
    
                        mistakes:
                            player.sceneState.mistakes,
    
                        finished: false,
    
                        result: null,
    
                        points: 0
                    }
                );
    
                return;
            }
    
            // ==================================================
            // ПРАВИЛЬНЫЙ ОТВЕТ
            // ==================================================
    
            console.log(
                `Игрок ${player.nickname}: ` +
                `правильно ответил по ${cardId}`
            );
    
            // ------------------------------------------
            // ЕСЛИ ЭТО БАГ — ДОБАВЛЯЕМ В НАЙДЕННЫЕ
            // ------------------------------------------
    
            if (isBug) {
    
                player.sceneState.foundBugs.push(
                    cardId
                );
    
            }
    
            const found =
                player.sceneState.foundBugs.length;
    
            const totalBugs =
                scene.bugs.length;
    
            // ------------------------------------------
            // ВСЕ БАГИ НАЙДЕНЫ
            // ------------------------------------------
    
            if (
                found >= totalBugs
            ) {
    
                player.sceneState.status =
                    "won";
    
                const points =
                    scene.points || 0;
    
                player.score += points;
    
                console.log(
                    `Игрок ${player.nickname} ` +
                    `нашёл ВСЕ БАГИ. ` +
                    `+${points} очков`
                );
    
                socket.emit(
                    "bugsearch:result",
                    {
                        cardId,
    
                        answer,
    
                        correct: true,
    
                        found,
    
                        totalBugs,
    
                        mistakes:
                            player.sceneState.mistakes,
    
                        finished: true,
    
                        result: "win",
    
                        points
                    }
                );
    
                return;
            }
    
            // ------------------------------------------
            // ПРАВИЛЬНЫЙ ОТВЕТ, НО ИГРА ПРОДОЛЖАЕТСЯ
            // ------------------------------------------
    
            socket.emit(
                "bugsearch:result",
                {
                    cardId,
    
                    answer,
    
                    correct: true,
    
                    found,
    
                    totalBugs,
    
                    mistakes:
                        player.sceneState.mistakes,
    
                    finished: false,
    
                    result: null,
    
                    points: 0
                }
            );
    
        }
    );
    // ==================================================
    // ADMIN: CREATE GAME
    // ==================================================

    socket.on(
        "admin:create_game",
        () => {

            const gameId =
                generateGameCode();

                const game = {

                    id: gameId,
                
                    status: "lobby",
                
                    currentScene: null,
                
                    sceneTimer: null,
                
                    sceneTimerTimeout: null,
                
                    players: new Map(),
                
                    kickedPlayers: new Set()
                
                };

            games.set(
                gameId,
                game
            );

            socket.join(
                `game_${gameId}`
            );

            socket.gameId =
                gameId;

            socket.isAdmin =
                true;

            console.log(
                `Создана игра: ${gameId}`
            );

            socket.emit(
                "admin:game_created",
                {
                    gameId
                }
            );

        }
    );


    // ==================================================
    // PLAYER: JOIN GAME
    // ==================================================

    socket.on(
        "player:join_game",
        ({ gameId, nickname, playerId }) => {
    
            const normalizedGameId =
                gameId.trim().toUpperCase();
    
            const normalizedNickname =
                nickname.trim();
    
    
            const game =
                games.get(
                    normalizedGameId
                );
    
    
            // ------------------------------------------
            // ИГРА НЕ НАЙДЕНА
            // ------------------------------------------
    
            if (!game) {
    
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Игра с таким кодом не найдена."
                    }
                );
    
                return;
            }
    
    
            // ------------------------------------------
            // ИГРА УЖЕ НАЧАЛАСЬ
            // ------------------------------------------
    
            if (game.status !== "lobby") {
    
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Игра уже началась."
                    }
                );
    
                return;
            }
    
    
            // ------------------------------------------
            // ПРОВЕРКА НИКА
            // ------------------------------------------
    
            if (!normalizedNickname) {
    
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Введите никнейм."
                    }
                );
    
                return;
            }
    
    
            // ------------------------------------------
            // ПРОВЕРКА PLAYER ID
            // ------------------------------------------
    
            if (!playerId) {
    
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Не удалось определить игрока. Обновите страницу."
                    }
                );
    
                return;
            }
            if (
                game.kickedPlayers.has(
                    playerId
                )
            ) {
            
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Вы были исключены из игры администратором."
                    }
                );
            
                return;
            }
    
    
            // ------------------------------------------
            // ИЩЕМ СУЩЕСТВУЮЩЕГО ИГРОКА
            // ------------------------------------------
    
            const existingPlayer =
                [...game.players.values()]
                    .find(
                        player =>
                            player.id === playerId
                    );
    
    
            // ------------------------------------------
            // ЕСЛИ ИГРОК УЖЕ ЕСТЬ
            // ЭТО ПЕРЕПОДКЛЮЧЕНИЕ
            // ------------------------------------------
    
            if (existingPlayer) {
    
                console.log(
                    `Игрок ${existingPlayer.nickname} переподключился`
                );
    
    
                // Обновляем socket
    
                existingPlayer.socketId =
                    socket.id;
    
    
                socket.join(
                    `game_${normalizedGameId}`
                );
    
    
                socket.gameId =
                    normalizedGameId;
    
                socket.isAdmin =
                    false;
    
    
                // Сообщаем игроку, что он снова подключён
    
                socket.emit(
                    "player:joined",
                    {
                        gameId:
                            normalizedGameId,
    
                        nickname:
                            existingPlayer.nickname
                    }
                );
    
    
                // Если команда уже выбрана,
                // возвращаем игрока на waiting screen
    
                if (existingPlayer.team) {
    
                    socket.emit(
                        "player:team_selected",
                        {
                            team:
                                existingPlayer.team
                        }
                    );
    
                }
    
    
                broadcastLobbyUpdate(
                    game
                );
    
    
                return;
            }
    
    
            // ------------------------------------------
            // ПРОВЕРКА УНИКАЛЬНОСТИ НИКА
            // ------------------------------------------
    
            const nicknameExists =
                [...game.players.values()]
                    .some(
                        player =>
                            player.nickname.toLowerCase() ===
                            normalizedNickname.toLowerCase()
                    );
    
    
            if (nicknameExists) {
    
                socket.emit(
                    "player:join_error",
                    {
                        message:
                            "Такой никнейм уже занят."
                    }
                );
    
                return;
            }
    
    
            // ------------------------------------------
            // СОЗДАЁМ НОВОГО ИГРОКА
            // ------------------------------------------
    
            const player = {
    
                id:
                    playerId,
    
                socketId:
                    socket.id,
    
                nickname:
                    normalizedNickname,
    
                team:
                    null,
    
                score:
                    0,
                
                currentChoice:
                    null,

                sceneState: null,
    
                kicked:
                    false    
            };
    
    
            game.players.set(
                playerId,
                player
            );
    
    
            socket.join(
                `game_${normalizedGameId}`
            );
    
    
            socket.gameId =
                normalizedGameId;
    
            socket.isAdmin =
                false;
    
    
            console.log(
                `Игрок ${normalizedNickname} вошёл в игру ${normalizedGameId}`
            );
    
    
            socket.emit(
                "player:joined",
                {
                    gameId:
                        normalizedGameId,
    
                    nickname:
                        normalizedNickname
                }
            );
    
    
            broadcastLobbyUpdate(
                game
            );
    
        }
    );


    // ==================================================
    // PLAYER: CHOOSE TEAM
    // ==================================================

    socket.on(
        "player:choose_team",
        ({ team }) => {

            if (!socket.gameId) {
                return;
            }


            const game =
                games.get(
                    socket.gameId
                );


            if (!game) {
                return;
            }

            // Команду можно выбрать только в лобби (до начала игры)

            if (game.status !== "lobby") {
                return;
            }



            const player =
    [...game.players.values()]
        .find(
            player =>
                player.socketId ===
                socket.id
        );


            if (!player) {
                return;
            }


            const allowedTeams = [
                "strategist",
                "joker",
                "critic"
            ];


            if (!allowedTeams.includes(team)) {

                return;
            }


            // Сохраняем команду

            player.team =
                team;


            console.log(
                `Игрок ${player.nickname} выбрал ${team}`
            );


            socket.emit(
                "player:team_selected",
                {
                    team
                }
            );


            // Обновляем данные у админа

            broadcastLobbyUpdate(
                game
            );

        }
    );

// ==================================================
// PLAYER: CHOICE
// ==================================================

socket.on(
    "player:choice",
    ({ choiceId }) => {

        console.log(
            `Игрок ${socket.id} выбрал: ${choiceId}`
        );


        // ------------------------------------------
        // ПРОВЕРЯЕМ ИГРУ
        // ------------------------------------------

        if (!socket.gameId) {
            return;
        }


        const game =
            games.get(
                socket.gameId
            );


        if (!game) {
            return;
        }


        // ------------------------------------------
        // ИГРА ДОЛЖНА ИДТИ
        // ------------------------------------------

        if (game.status !== "playing") {
            return;
        }


        // ------------------------------------------
        // ПРОВЕРЯЕМ ГОЛОСОВАНИЕ
        // ------------------------------------------

        if (
            !game.voting ||
            !game.voting.active
        ) {

            console.log(
                "Голосование сейчас не активно."
            );

            return;
        }


        // ------------------------------------------
        // ИЩЕМ ИГРОКА
        // ------------------------------------------

        const player =
            [...game.players.values()]
                .find(
                    player =>
                        player.socketId ===
                        socket.id
                );


        if (!player) {
            return;
        }


        // ------------------------------------------
        // ПРОВЕРЯЕМ СЦЕНУ
        // ------------------------------------------

        const scene =
            game.currentScene;


        if (
            !scene ||
            !scene.choices ||
            !Array.isArray(scene.choices)
        ) {

            console.error(
                "Текущая сцена некорректна:",
                scene
            );

            return;
        }


        // ------------------------------------------
        // ИЩЕМ ВЫБРАННЫЙ ВАРИАНТ
        // ------------------------------------------

        const choice =
            scene.choices.find(
                choice =>
                    choice.id ===
                    choiceId
            );


        if (!choice) {

            console.log(
                `Неизвестный вариант: ${choiceId}`
            );

            return;
        }

        // ------------------------------------------
        // ЕСЛИ ЭТО ПОВТОРНОЕ ГОЛОСОВАНИЕ,
        // ПРОВЕРЯЕМ ДОПУСТИМЫЙ ВАРИАНТ
        // ------------------------------------------

        if (
            game.voting.allowedChoices &&
            !game.voting.allowedChoices.has(choiceId)
        ) {

            console.log(
                `Вариант ${choiceId} недоступен ` +
                `в текущем голосовании.`
            );

            return;
        }


       // ------------------------------------------
        // СОХРАНЯЕМ / ОБНОВЛЯЕМ ВЫБОР
        // ------------------------------------------

        game.voting.choices.set(
            player.id,
            choiceId
        );

        player.currentChoice =
            choiceId;

                console.log(
                    `Игрок ${player.nickname} ` +
                    `выбрал вариант: ${choiceId}`
                );


        // ------------------------------------------
        // ОТВЕТ ИГРОКУ
        // ------------------------------------------

        socket.emit(
            "player:choice_result",
            {
                choiceId
            }
        );

    }
);


    // ==================================================
    // ADMIN: START GAME
    // ==================================================

    socket.on(
        "admin:start_game",
        () => {

            // Проверяем, что это админ

            if (!socket.isAdmin) {

                console.log(
                    "Попытка запуска игры не администратором"
                );

                return;
            }


            if (!socket.gameId) {
                return;
            }


            const game =
                games.get(
                    socket.gameId
                );


            if (!game) {
                return;
            }


            // Игра уже идёт

            if (game.status !== "lobby") {

                socket.emit(
                    "admin:start_error",
                    {
                        message:
                            "Игра уже запущена."
                    }
                );

                return;
            }


            // Нельзя запустить игру без игроков

            if (game.players.size === 0) {

                socket.emit(
                    "admin:start_error",
                    {
                        message:
                            "Нельзя начать игру без игроков."
                    }
                );

                return;
            }

            // ==========================================
            // ЗАПУСК
            // ==========================================

            game.status = "playing";

            // Игрокам, которые не выбрали команду, назначаем случайную

            const allowedTeams = ["strategist", "joker", "critic"];

            for (const player of game.players.values()) {
                if (!player.team) {
                    const randomIndex = Math.floor(Math.random() * allowedTeams.length);
                    player.team = allowedTeams[randomIndex];
                    console.log(
                        `Игрок ${player.nickname} не выбрал команду. ` +
                        `Автоматически назначена: ${player.team}`
                    );
                }
            }

            // Обновляем данные в админке

            broadcastLobbyUpdate(game);


            game.currentScene =
                introScene;

            startSceneTimer(
                game,
                introScene.duration || 30
            );

            game.voting = {
                active: false,
                choices: new Map(),
                endsAt: null,
                round: 0
            };

            console.log(
                `ИГРА ${game.id} НАЧАЛАСЬ`
            );

            // Отправляем всем сцену intro

            io.to(
                `game_${game.id}`
            ).emit(
                "game:started",
                {
                    scene: introScene,
                    timer: game.sceneTimer
                }
            );

            // Запускаем голосование для intro

            startSceneVoting(
                game,
                introScene
            );

        }
    );

// ==================================================
// ADMIN: KICK PLAYER
// ==================================================

socket.on(
    "admin:kick_player",
    ({ playerId }) => {

        // Проверяем, что запрос отправил администратор

        if (!socket.isAdmin) {

            console.log(
                "Попытка выгнать игрока не администратором"
            );

            return;
        }


        // Проверяем наличие игры

        if (!socket.gameId) {
            return;
        }


        const game =
            games.get(
                socket.gameId
            );


        if (!game) {
            return;
        }


        // Игрока можно выгнать только из lobby

        if (game.status !== "lobby") {

            socket.emit(
                "admin:kick_error",
                {
                    message:
                        "Игроков можно выгонять только до начала игры."
                }
            );

            return;
        }


        // Ищем игрока

        const player =
            game.players.get(
                playerId
            );


        if (!player) {

            socket.emit(
                "admin:kick_error",
                {
                    message:
                        "Игрок не найден."
                }
            );

            return;
        }


        console.log(
            `Администратор выгоняет игрока ${player.nickname}`
        );


        player.kicked = true;

        game.kickedPlayers.add(
            playerId
        );

        const playerSocket =
    io.sockets.sockets.get(
        player.socketId
    );


        // Сначала сообщаем игроку,
        // что его удалили

        if (playerSocket) {

            playerSocket.emit(
                "player:kicked",
                {
                    message:
                        "Вы были удалены из игры администратором."
                }
            );


            // Убираем его из комнаты

            playerSocket.leave(
                `game_${game.id}`
            );


            // Удаляем ссылку на игру

            playerSocket.gameId =
                null;

        }


        // Удаляем игрока из игры

        game.players.delete(
            playerId
        );


        // Обновляем lobby

        broadcastLobbyUpdate(
            game
        );

    }
);


    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on(
        "disconnect",
        () => {
    
            console.log(
                "Отключение:",
                socket.id
            );
    
    
            if (!socket.gameId) {
                return;
            }
    
    
            const game =
                games.get(
                    socket.gameId
                );
    
    
            if (!game) {
                return;
            }
    
    
            const player =
                [...game.players.values()]
                    .find(
                        player =>
                            player.socketId ===
                            socket.id
                    );
    
    
            if (player) {
    
                console.log(
                    `Игрок ${player.nickname} отключился, ` +
                    `но остаётся в игре`
                );
    
            }
    
        }
    );
});


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

server.listen(
    PORT,
    () => {

        console.log(
            `Сервер запущен: http://localhost:${PORT}`
        );

    }
);