const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const introScene =
    require("./game/scenes/intro");

const PORT = process.env.PORT || 3000;
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
        game.sceneTimerTimeout = null;
        return;
    }

    // Отменяем предыдущий таймер
    if (game.sceneTimerTimeout) {
        clearTimeout(game.sceneTimerTimeout);
        game.sceneTimerTimeout = null;
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

            game.sceneTimerTimeout = null;

            // Если за это время игра была поставлена
            // на паузу — ничего не делаем
            if (game.status !== "playing") {
                return;
            }

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

// ==================================================
// PAUSE GAME
// ==================================================

function pauseGame(game) {

    if (game.status !== "playing") {
        return false;
    }

    console.log(
        `Пауза игры ${game.id}`
    );

    // ------------------------------------------
    // Сохраняем оставшееся время таймера сцены
    // ------------------------------------------

    let sceneTimerRemaining = null;

    if (
        game.sceneTimer &&
        game.sceneTimer.endsAt
    ) {

        sceneTimerRemaining =
            Math.max(
                0,
                game.sceneTimer.endsAt - Date.now()
            );
    }

    // Теперь останавливаем таймер сцены
    if (game.sceneTimerTimeout) {

        clearTimeout(
            game.sceneTimerTimeout
        );

        game.sceneTimerTimeout = null;
    }

    // Сам активный таймер больше не нужен
    game.sceneTimer = null;


    // ------------------------------------------
    // Сохраняем оставшееся время голосования
    // ------------------------------------------

    let votingRemaining = null;

    if (
        game.voting &&
        game.voting.active &&
        game.voting.endsAt
    ) {

        votingRemaining =
            Math.max(
                0,
                game.voting.endsAt - Date.now()
            );
    }


    // ------------------------------------------
    // Останавливаем таймер голосования
    // ------------------------------------------

    if (game.votingTimeout) {

        clearTimeout(
            game.votingTimeout
        );

        game.votingTimeout = null;
    }


    // ------------------------------------------
    // Сохраняем оставшееся время transition
    // ------------------------------------------

    let transitionRemaining = null;

    if (
        game.transitionTimeout &&
        game.transitionEndsAt
    ) {

        transitionRemaining =
            Math.max(
                0,
                game.transitionEndsAt - Date.now()
            );

        clearTimeout(
            game.transitionTimeout
        );

        game.transitionTimeout = null;

        game.transitionEndsAt = null;
    }


    // ------------------------------------------
    // Сохраняем состояние паузы
    // ------------------------------------------

    game.pauseState = {

        sceneTimerRemaining,

        votingRemaining,

        transitionRemaining

    };


    // ------------------------------------------
    // Меняем статус
    // ------------------------------------------

    game.status = "paused";


    // ------------------------------------------
    // Сообщаем всем игрокам
    // ------------------------------------------

    io.to(
        `game_${game.id}`
    ).emit(
        "game:paused",
        {
            gameId: game.id,

            timerRemaining:
                sceneTimerRemaining
        }
    );


    console.log(
        `Игра ${game.id} поставлена на паузу. ` +
        `Осталось: ${
            sceneTimerRemaining !== null
                ? (sceneTimerRemaining / 1000).toFixed(2)
                : "нет таймера"
        } сек.`
    );

    return true;
}


// ==================================================
// RESUME GAME
// ==================================================

function resumeGame(game) {

    if (game.status !== "paused") {
        return false;
    }

    console.log(
        `Продолжаем игру ${game.id}`
    );

    const pauseState =
        game.pauseState || {};

    // ------------------------------------------
    // Возвращаем статус
    // ------------------------------------------

    game.status =
        "playing";


    // ------------------------------------------
    // Восстанавливаем таймер сцены
    // ------------------------------------------

    if (
        pauseState.sceneTimerRemaining !== null &&
        pauseState.sceneTimerRemaining !== undefined
    ) {

        if (
            pauseState.sceneTimerRemaining > 0
        ) {

            startSceneTimer(
                game,
                pauseState.sceneTimerRemaining / 1000
            );

        } else {

            game.sceneTimer = null;

        }

    }


    // ------------------------------------------
    // Восстанавливаем голосование
    // ------------------------------------------

    if (
        game.voting &&
        game.voting.active &&
        pauseState.votingRemaining !== null &&
        pauseState.votingRemaining !== undefined &&
        pauseState.votingRemaining > 0
    ) {

        game.voting.endsAt =
            Date.now() +
            pauseState.votingRemaining;

        const scene =
            game.currentScene;

        game.votingTimeout =
            setTimeout(
                () => {

                    game.votingTimeout =
                        null;

                    if (
                        game.status !== "playing"
                    ) {
                        return;
                    }

                    finishSceneVoting(
                        game,
                        scene
                    );

                },
                pauseState.votingRemaining
            );


        io.to(
            `game_${game.id}`
        ).emit(
            "voting:resumed",
            {
                endsAt:
                    game.voting.endsAt,

                round:
                    game.voting.round
            }
        );

    }


    // ------------------------------------------
    // Восстанавливаем transition
    // ------------------------------------------

    if (
        pauseState.transitionRemaining !== null &&
        pauseState.transitionRemaining !== undefined &&
        pauseState.transitionRemaining > 0
    ) {

        game.transitionEndsAt =
            Date.now() +
            pauseState.transitionRemaining;

        game.transitionTimeout =
            setTimeout(
                () => {

                    game.transitionTimeout =
                        null;

                    game.transitionEndsAt =
                        null;

                    if (
                        game.status !== "playing"
                    ) {
                        return;
                    }

                    moveToNextScene(
                        game
                    );

                },
                pauseState.transitionRemaining
            );

    }


    // ------------------------------------------
    // Если таймер сцены закончился во время паузы
    // ------------------------------------------

    if (
        pauseState.sceneTimerRemaining !== null &&
        pauseState.sceneTimerRemaining !== undefined &&
        pauseState.sceneTimerRemaining <= 0 &&
        !game.voting?.active &&
        !game.transitionTimeout
    ) {

        setTimeout(
            () => {

                if (
                    game.status !== "playing"
                ) {
                    return;
                }

                moveToNextScene(
                    game
                );

            },
            0
        );

    }


    // ------------------------------------------
    // Очищаем pause state
    // ------------------------------------------

    game.pauseState =
        null;


    // ------------------------------------------
    // Сообщаем игрокам
    // ------------------------------------------

    io.to(
        `game_${game.id}`
    ).emit(
        "game:resumed",
        {
            gameId: game.id,

            timer:
                game.sceneTimer,

            voting:
                game.voting
                    ? {
                        active:
                            game.voting.active,

                        endsAt:
                            game.voting.endsAt,

                        round:
                            game.voting.round,

                        allowedChoices:
                            game.voting.allowedChoices
                                ? [
                                    ...game.voting.allowedChoices
                                ]
                                : null
                    }
                    : null
        }
    );


    console.log(
        `Игра ${game.id} продолжена`
    );

    return true;
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

// -------------------------------------------------
// SEND PLAYER STATE (для восстановления)
// -------------------------------------------------
function sendPlayerState(socket, game, player) {
    socket.emit("player:restore_state", {
        gameId: game.id,
    
        nickname: player.nickname,
    
        team: player.team,
        score: player.score,
    
        status: game.status,
    
        scene: game.currentScene,
    
        sceneState: player.sceneState,
    
        choiceId:
            player.sceneState?.choiceId ??
            player.currentChoice ??
            null,
    
        timer: game.sceneTimer,
    
        voting: game.voting
            ? {
                active: game.voting.active,
                endsAt: game.voting.endsAt
            }
            : null,
    
        pauseState:
            game.pauseState
                ? {
                    sceneTimerRemaining:
                        game.pauseState.sceneTimerRemaining,
    
                    votingRemaining:
                        game.pauseState.votingRemaining,
    
                    transitionRemaining:
                        game.pauseState.transitionRemaining
                }
                : null
    });
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

    if (game.votingTimeout) {
        clearTimeout(game.votingTimeout);
        game.votingTimeout = null;
    }
    const duration = scene.voting?.duration || 15;

    game.voting = {
        active: true,
    
        choices: new Map(),
    
        endsAt:
            Date.now() +
            duration * 1000
    };

    console.log(
        `[VOTING START DEBUG] game=${game.id} ` +
        `scene=${game.currentScene?.id} ` +
        `duration=${duration} ` +
        `endsAt=${game.voting.endsAt}`
    );
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
            scene: game.currentScene
        }
    );

    game.votingTimeout =
        setTimeout(
            () => {

                game.votingTimeout = null;

                if (game.status !== "playing") {
                    return;
                }

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
            game.status = "finished";
            const results =
                [...game.players.values()]
                    .map(player => ({
                        nickname: player.nickname,
                        score: player.score
                    }))
                    .sort((a, b) => b.score - a.score);
        
            io.to(
                `game_${game.id}`
            ).emit(
                "game:finished",
                {
                    results
                }
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
    
        endsAt: null
    
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
// finishSceneVoting – теперь поддерживает переход
// ---------------------------------------------------------------
function finishSceneVoting(game, scene) {

    console.log(
        `[VOTING TIMER FIRED] game=${game.id} ` +
        `scene=${game.currentScene?.id} ` +
        `active=${game.voting?.active} ` +
        `choices=${game.voting?.choices?.size}`
    );

    if (!game.voting || !game.voting.active) {
        return;
    }

    game.voting.active = false;

    // --------------------------------------------------
    // СОБИРАЕМ ГОЛОСА
    // --------------------------------------------------

    const voteCounts = {};

    for (const choiceId of game.voting.choices.values()) {

        voteCounts[choiceId] =
            (voteCounts[choiceId] || 0) + 1;
    }


    const choices = scene.choices || [];


    // --------------------------------------------------
    // ПРОВЕРЯЕМ, ЕСТЬ ЛИ ВООБЩЕ ВАРИАНТЫ
    // --------------------------------------------------

    if (choices.length === 0) {

        console.log(
            `Нет вариантов для голосования: ${scene.id}`
        );

        io.to(`game_${game.id}`).emit(
            "voting:finished",
            {
                voteCounts,
                winner: null,
                winnerChoice: null,
                tie: false
            }
        );

        game.transitionEndsAt =
            Date.now() + 5000;

        game.transitionTimeout =
            setTimeout(
                () => {

                    game.transitionTimeout = null;
                    game.transitionEndsAt = null;

                    if (game.status !== "playing") {
                        return;
                    }

                    moveToNextScene(game);

                },
                5000
            );

        return;
    }


    let winner;
    let tie = false;


    // --------------------------------------------------
    // НИКТО НЕ ГОЛОСОВАЛ
    // --------------------------------------------------

    if (
        Object.keys(voteCounts).length === 0
    ) {

        winner =
            choices[
                Math.floor(
                    Math.random() * choices.length
                )
            ].id;

        console.log(
            `Никто не проголосовал. ` +
            `Случайно выбран вариант: ${winner}`
        );

    }


    // --------------------------------------------------
    // ЕСТЬ ГОЛОСА
    // --------------------------------------------------

    else {

        const maxVotes =
            Math.max(
                ...Object.values(voteCounts)
            );


        const winners =
            Object.entries(voteCounts)
                .filter(
                    ([choiceId, votes]) =>
                        votes === maxVotes
                )
                .map(
                    ([choiceId]) =>
                        choiceId
                );


        // --------------------------------------------------
        // НИЧЬЯ
        // --------------------------------------------------

        if (winners.length > 1) {

            tie = true;

            winner =
                winners[
                    Math.floor(
                        Math.random() * winners.length
                    )
                ];

            console.log(
                `Ничья: ${winners.join(", ")}. ` +
                `Случайно выбран победитель: ${winner}`
            );

        }


        // --------------------------------------------------
        // ЕДИНСТВЕННЫЙ ПОБЕДИТЕЛЬ
        // --------------------------------------------------

        else {

            winner = winners[0];

            console.log(
                `Победитель голосования: ${winner} ` +
                `(${maxVotes} голосов)`
            );
        }
    }


    // --------------------------------------------------
    // НАХОДИМ ВЫИГРАВШИЙ ВАРИАНТ
    // --------------------------------------------------

    const winningChoice =
        choices.find(
            choice =>
                choice.id === winner
        );


    if (!winningChoice) {

        console.error(
            `Не найден вариант-победитель: ${winner}`
        );

        io.to(`game_${game.id}`).emit(
            "voting:finished",
            {
                voteCounts,
                winner: null,
                winnerChoice: null,
                tie
            }
        );

        game.transitionEndsAt =
            Date.now() + 5000;

        game.transitionTimeout =
            setTimeout(
                () => {

                    game.transitionTimeout = null;
                    game.transitionEndsAt = null;

                    if (game.status !== "playing") {
                        return;
                    }

                    moveToNextScene(game);

                },
                5000
            );

        return;
    }


    // --------------------------------------------------
    // НАЧИСЛЯЕМ ОЧКИ
    // --------------------------------------------------

    awardVotingPoints(
        game,
        scene,
        winner
    );


    // --------------------------------------------------
    // ОПРЕДЕЛЯЕМ СЛЕДУЮЩУЮ СЦЕНУ
    // --------------------------------------------------

    game.nextSceneId =
        winningChoice.nextSceneId ||
        scene.nextSceneId ||
        null;


    // --------------------------------------------------
    // ОТПРАВЛЯЕМ РЕЗУЛЬТАТ КЛИЕНТАМ
    // --------------------------------------------------

    io.to(`game_${game.id}`).emit(
        "voting:finished",
        {
            voteCounts,
            winner,
            winnerChoice: winningChoice,
            tie
        }
    );


    console.log(
        `Голосование завершено: ${game.id} / ${scene.id}`
    );

    console.log(
        `Итоговый вариант: ${winningChoice.id}`
    );

    console.log(
        `Следующая сцена: ${game.nextSceneId}`
    );


    // --------------------------------------------------
    // TRANSITION 5 СЕКУНД
    // --------------------------------------------------

    game.transitionEndsAt =
        Date.now() + 5000;

    game.transitionTimeout =
        setTimeout(
            () => {

                game.transitionTimeout = null;
                game.transitionEndsAt = null;

                if (game.status !== "playing") {
                    return;
                }

                moveToNextScene(game);

            },
            5000
        );
        console.log(
            `[FINISH VOTING DONE] game=${game.id} ` +
            `scene=${game.currentScene?.id}`
        );
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
    
                transitionTimeout: null,
    
                transitionEndsAt: null,
    
                votingTimeout: null,
    
                voting: null,
    
                pauseState: null,
    
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
                `Создана новая игра: ${gameId}`
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

                /* ----------------------------------------------------------------------
                * 1️⃣  Подготовка и базовая валидация входных параметров
                * ---------------------------------------------------------------------- */
                const normalizedGameId    = gameId?.trim().toUpperCase() ?? "";
                const normalizedNick     = nickname?.trim() ?? "";
                const normalizedPlayerId = playerId ?? "";

                // -----------------------------------------
                // Игра должна существовать
                // -----------------------------------------
                const game = games.get(normalizedGameId);
                if (!game) {
                    socket.emit("player:join_error", {
                        message: "Игра с таким кодом не найдена."
                    });
                    return;
                }

                /* ----------------------------------------------------------------------
                * 2️⃣  Переподключение (уже известный playerId)
                * ---------------------------------------------------------------------- */
                const existingPlayer = game.players.get(normalizedPlayerId);
                if (existingPlayer) {

                    console.log(
                        `Игрок ${existingPlayer.nickname} (${existingPlayer.id}) ` +
                        `переподключается к партии ${normalizedGameId}`
                    );

                    // Обновляем сведения о соединении
                    existingPlayer.socketId = socket.id;
                    existingPlayer.kicked   = false;          // если был кикнут – снимаем отметку
                    if (game.kickedPlayers) {
                        game.kickedPlayers.delete(normalizedPlayerId);
                    }

                    socket.join(`game_${normalizedGameId}`);
                    socket.gameId = normalizedGameId;
                    socket.isAdmin = false;

                    // Сообщаем клиенту, что это восстановление
                    socket.emit("player:joined", {
                        gameId: normalizedGameId,
                        nickname: existingPlayer.nickname,
                        restored: true           // <-- важный флаг
                    });

                    // Отсылаем полное состояние игрока
                    sendPlayerState(socket, game, existingPlayer);

                    // Обновляем лист лобби
                    broadcastLobbyUpdate(game);
                    return;
                }

                /* ----------------------------------------------------------------------
                * 3️⃣  Новый игрок (playerId ещё не известен в игре)
                * ---------------------------------------------------------------------- */

                // Игра должна находиться в лобби
                if (game.status !== "lobby") {
                    socket.emit("player:join_error", {
                        message: "Игра уже началась."
                    });
                    return;
                }

                // Ник обязателен
                if (!normalizedNick) {
                    socket.emit("player:join_error", {
                        message: "Введите никнейм."
                    });
                    return;
                }

                // playerId обязателен (должен быть в localStorage)
                if (!normalizedPlayerId) {
                    socket.emit("player:join_error", {
                        message: "Не удалось определить игрока. Обновите страницу."
                    });
                    return;
                }

                // Проверка на исключение администратором
                if (game.kickedPlayers && game.kickedPlayers.has(normalizedPlayerId)) {
                    console.log(
                        `Игрок ${normalizedPlayerId} попытался вернуться после исключения`
                    );
                    socket.emit("player:join_error", {
                        message: "Вы были исключены из игры администратором."
                    });
                    return;
                }

                // Ник должен быть уникален внутри партии
                const nickTaken = [...game.players.values()].some(p =>
                    p.nickname?.toLowerCase() === normalizedNick.toLowerCase()
                );
                if (nickTaken) {
                    socket.emit("player:join_error", {
                        message: "Такой никнейм уже занят."
                    });
                    return;
                }

                // Создаём объект игрока
                const player = {
                    id: normalizedPlayerId,
                    socketId: socket.id,
                    nickname: normalizedNick,
                    team: null,
                    score: 0,
                    currentChoice: null,
                    sceneState: null,
                    kicked: false
                };

                game.players.set(normalizedPlayerId, player);

                // Привязываем сокет к комнате
                socket.join(`game_${normalizedGameId}`);
                socket.gameId = normalizedGameId;
                socket.isAdmin = false;

                console.log(
                    `Игрок ${normalizedNick} вошёл в игру ${normalizedGameId}`
                );

                // --------------------- ОТПРАВЛЯЕМ СОБЫТИЕ О ПОДКЛЮЧЕНИИ ---------------------
                socket.emit(
                    "player:joined",
                    {
                        gameId: normalizedGameId,
                        nickname: normalizedNick,   // <-- правильный ник
                        restored: false             // <-- новый игрок, а не восстановление
                    }
                );

                // Обновляем список игроков в лобби
                broadcastLobbyUpdate(game);

                // Дальше ничего не делаем – дальше клиент получит
                // остальные события (game:started и т.д.) от сервера.
                return;
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
            `[CHOICE DEBUG] socket=${socket.id} ` +
            `game=${socket.gameId} ` +
            `choice=${choiceId} ` +
            `scene=${games.get(socket.gameId)?.currentScene?.id} ` +
            `votingActive=${games.get(socket.gameId)?.voting?.active}`
        );
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
                endsAt: null
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
    // ADMIN: PAUSE / RESUME GAME
    // ==================================================

    socket.on(
        "admin:pause_game",
        () => {

            // ------------------------------------------
            // Проверяем администратора
            // ------------------------------------------

            if (!socket.isAdmin) {

                console.log(
                    "Попытка поставить игру на паузу " +
                    "не администратором"
                );

                return;
            }


            // ------------------------------------------
            // Проверяем gameId
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
            // PLAYING -> PAUSED
            // ------------------------------------------

            if (game.status === "playing") {

                const success =
                    pauseGame(game);

                if (!success) {
                    return;
                }

                socket.emit(
                    "admin:pause_changed",
                    {
                        paused: true
                    }
                );

                return;
            }


            // ------------------------------------------
            // PAUSED -> PLAYING
            // ------------------------------------------

            if (game.status === "paused") {

                const success =
                    resumeGame(game);

                if (!success) {
                    return;
                }

                socket.emit(
                    "admin:pause_changed",
                    {
                        paused: false
                    }
                );

                return;
            }


            // ------------------------------------------
            // Нельзя ставить lobby на паузу
            // ------------------------------------------

            socket.emit(
                "admin:pause_error",
                {
                    message:
                        "Поставить на паузу можно только запущенную игру."
                }
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

        console.log(`Сервер запущен на порту ${PORT}`);

    }
);