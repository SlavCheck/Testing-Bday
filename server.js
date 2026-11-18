const express = require("express");
const http = require("http");
const { randomBytes, timingSafeEqual } = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const introScene =
    require("./game/scenes/intro");
const snitchScene = require("./game/scenes/snitch-theft");
const snitchAnnouncement = require("./game/scenes/snitch-announcement");
const snitchFlight = require("./game/scenes/snitch-flight");
const garlandFire = require("./game/scenes/garland-fire");
const invisibilityCloak = require("./game/scenes/invisibility-cloak");
const potionRecipe = require("./game/scenes/potion-recipe");
const potionIntro = require("./game/scenes/potion-intro");
const potionNegativeIntro = require("./game/scenes/potion-negative-intro");
const potionNegativeTest = require("./game/scenes/potion-negative-test");
const treeIntro = require("./game/scenes/tree-intro");
const treeSpell = require("./game/scenes/tree-spell");
const treeFinale = require("./game/scenes/tree-finale");
const novelScript = require("./game/scenes/novel-script");
// Each minigame interrupts its own story screen between introduction and aftermath.
const NOVEL_SPLITS = {7:6,9:3,11:3,13:4,15:3,17:6};
const novelScenes = Object.fromEntries(novelScript.map(screen => [screen.number, {
    id:"novel-"+screen.number,type:"visual_novel",title:screen.title,
    screen:{...screen,beats: NOVEL_SPLITS[screen.number] == null ? screen.beats : screen.beats.slice(0,NOVEL_SPLITS[screen.number])},
    duration:Math.max(25,(NOVEL_SPLITS[screen.number] == null ? screen.beats.length : NOVEL_SPLITS[screen.number])*6)
}]));
const novelAfterScenes = Object.fromEntries(Object.entries(NOVEL_SPLITS).map(([key,split]) => {
    const number = Number(key), original = novelScript[number-1];
    const beats = original.beats.slice(split);
    return [number,{id:"novel-"+number+"-after",type:"visual_novel",title:original.title,
        screen:{...original,beats,phase:"after"},duration:Math.max(25,beats.length*6)}];
}));
const { assignNextHouse } = require("./game/services/houses");

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
const TREE_SPELLS = {
    gryffindor: "СМЕЛОСТЬ ВЕДЁТ К ПОБЕДЕ ВСЕГДА",
    ravenclaw: "ЗНАНИЯ ПОМОГАЮТ НАЙТИ ПУТЬ ИСТИНЫ",
    hufflepuff: "ДРУЖБА ОБЪЕДИНЯЕТ ВСЕХ НАС НАВСЕГДА",
    slytherin: "ХИТРОСТЬ СПОСОБНА ОТКРЫВАТЬ ЛЮБЫЕ ДВЕРИ"
};
function normalizeSpell(text) {
    return String(text || "").normalize("NFC").trim().replace(/\\s+/g, " ").toLocaleUpperCase("ru-RU");
}
function startTreeSpell(game) {
    game.currentScene = treeSpell;
    game.treeTeams = {};
    game.treeChat = {};
    for (const [house, phrase] of Object.entries(TREE_SPELLS)) {
        const members = [...game.players.values()].filter(p => p.house === house);
        if (!members.length) continue;
        const captain = members[Math.floor(Math.random() * members.length)];
        const recipients = members.filter(p => p.id !== captain.id);
        const targets = recipients.length ? recipients : [captain];
        const shuffled = phrase.split(" ").map((word, i) => ({ word, number: i + 1 }));
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const assignments = {};
        for (const member of members) assignments[member.id] = [];
        shuffled.forEach((part, i) => assignments[targets[i % targets.length].id].push(part));
        game.treeTeams[house] = { captainId: captain.id, assignments, solved: false };
        game.treeChat[house] = [];
    }
    startSceneTimer(game, treeSpell.duration);
    io.to(`game_${game.id}`).emit("game:started", { scene: treeSpell, timer: game.sceneTimer });
    for (const player of game.players.values()) {
        const target = [...game.players.values()].find(p => p.id === player.id);
        if (target?.socketId) io.to(target.socketId).emit("tree:role", treeRole(game, player));
    }
}
function treeRole(game, player) {
    const team = game.treeTeams?.[player.house];
    if (!team) return { house: player.house, captain: false, parts: [], solved: false };
    const captain = [...game.players.values()].find(p => p.id === team.captainId);
    return { house: player.house, captain: team.captainId === player.id, captainName: captain?.nickname || "",
        parts: team.assignments[player.id] || [], solved: team.solved };
}
function finishTreeGame(game) {
    game.status = "finished";
    if (game.sceneTimerTimeout) clearTimeout(game.sceneTimerTimeout);
    game.sceneTimerTimeout = null;
    game.sceneTimer = null;
    const results = [...game.players.values()].map(p => ({nickname:p.nickname,house:p.house,score:p.score})).sort((a,b)=>b.score-a.score);
    io.to(`game_${game.id}`).emit("game:finished", {results,houseScores:getHouseScores(game)});
}
function publicNegativePotionScene() {
    const { correctIds, ...safeScene } = potionNegativeTest;
    return safeScene;
}
function publicPotionScene() {
    const { correctIds, ...safeScene } = potionRecipe;
    return safeScene;
}

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

    const serverNow = Date.now();
    const endsAt = serverNow + duration * 1000;

    game.sceneTimer = {
        duration,
        endsAt,
        serverNow
    };

    io.to(`game_${game.id}`).emit("scene:timer", {
        duration,
        endsAt,
        serverNow
    });

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
        house: player.house,
        gameType: game.gameType || "harry-potter",
        snitchAnswer: player.snitchAnswer || null,
        score: player.score,
    
        status: game.status,
    
        scene: game.currentScene?.id === "potion-recipe" ? publicPotionScene() :
            game.currentScene?.id === "potion-negative-test" ? publicNegativePotionScene() : game.currentScene,
        potionAnswer: player.potionAnswer || [],
        negativePotionAnswer: player.negativePotionAnswer || [],
        treeRole: game.currentScene?.id === "tree-spell" ? treeRole(game, player) : null,
        treeChat: game.currentScene?.id === "tree-spell" ? (game.treeChat?.[player.house] || []) : [],
    
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



function getHouseScores(game) {
    const scores = { gryffindor: 0, slytherin: 0, ravenclaw: 0, hufflepuff: 0 };
    for (const player of game.players.values()) {
        if (Object.hasOwn(scores, player.house)) scores[player.house] += player.score || 0;
    }
    for (const [house, bonus] of Object.entries(game.houseBonuses || {})) {
        if (Object.hasOwn(scores, house)) scores[house] += bonus;
    }
    return scores;
}
function broadcastHouseScores(game) {
    // House totals stay server-side until the final results scene.
}
function broadcastLobbyUpdate(game) {
    const players = [...game.players.values()].map(player => ({
        id: player.id, nickname: player.nickname, house: player.house, team: player.team
    }));
    if (game.adminSocketId) io.to(game.adminSocketId).emit("lobby:update", {
        gameId: game.id, gameType: game.gameType || "harry-potter", status: game.status, players
    });
    broadcastHouseScores(game);
}
function isValidAdminToken(game, token) {
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) return false;
    const actual = Buffer.from(token, "hex");
    const expected = Buffer.from(game.adminToken, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
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
    broadcastHouseScores(game);

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
function startNovelScene(game, number, after = false) {
    const scene = after ? novelAfterScenes[number] : novelScenes[number];
    game.currentScene = scene;
    startSceneTimer(game, scene.duration);
    io.to(`game_${game.id}`).emit("game:started", {scene,timer:game.sceneTimer});
}
function startHpMiniGame(game, scene) {
    game.currentScene = scene;
    if (scene.id === "snitch-flight") game.snitchFlightStartedAt = Date.now();
    if (scene.id === "snitch-theft") for (const p of game.players.values()) p.snitchAnswer = null;
    if (scene.id === "garland-fire") for (const p of game.players.values()) p.garlandAnswer = null;
    if (scene.id === "invisibility-cloak") for (const p of game.players.values()) p.cloakAnswer = null;
    if (scene.id === "potion-recipe") for (const p of game.players.values()) p.potionAnswer = [];
    if (scene.id === "potion-negative-test") for (const p of game.players.values()) p.negativePotionAnswer = [];
    startSceneTimer(game, scene.duration);
    const safe = scene.id === "snitch-theft" ? {...scene,novelVoting:true,screen:novelScript[4]} : scene.id === "potion-recipe" ? publicPotionScene() : scene.id === "potion-negative-test" ? publicNegativePotionScene() : scene;
    io.to(`game_${game.id}`).emit("game:started", {scene:safe,timer:game.sceneTimer});
}
function moveToNextScene(game) {
    if (game.gameType !== "classic" && game.currentScene?.type === "visual_novel") {
        const number = game.currentScene.screen.number;
        const after = game.currentScene.screen.phase === "after";
        const mini = {5:snitchScene,7:snitchFlight,9:garlandFire,11:invisibilityCloak,13:potionRecipe,15:potionNegativeTest};
        if (!after && mini[number]) {startHpMiniGame(game,mini[number]);return;}
        if (!after && number === 17) {startTreeSpell(game);return;}
        if (number === 18) {finishTreeGame(game);return;}
        const next = {1:3,3:4,4:5,6:7,7:8,8:9,9:10,10:11,11:12,12:13,13:14,14:15,15:16,16:17,17:18};
        if (next[number]) {startNovelScene(game,next[number]);return;}
    }
    if (game.gameType !== "classic") {
        const afterGame = {"snitch-theft":6,"snitch-flight":7,"garland-fire":9,"invisibility-cloak":11,"potion-recipe":13,"potion-negative-test":15,"tree-spell":17};
        const n = afterGame[game.currentScene?.id];
        if (n) {startNovelScene(game,n,n!==6);return;}
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "snitch-announcement") {
        game.currentScene = snitchScene;
        startSceneTimer(game, snitchScene.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: snitchScene, timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "snitch-theft") {
        game.currentScene = { ...snitchFlight };
        game.snitchFlightStartedAt = Date.now();
        startSceneTimer(game, snitchFlight.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: game.currentScene, timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "snitch-flight") {
        game.currentScene = garlandFire;
        for (const player of game.players.values()) player.garlandAnswer = null;
        startSceneTimer(game, garlandFire.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: garlandFire, timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "garland-fire") {
        game.currentScene = invisibilityCloak;
        for (const player of game.players.values()) player.cloakAnswer = null;
        startSceneTimer(game, invisibilityCloak.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: invisibilityCloak, timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "invisibility-cloak") {
        game.currentScene = potionIntro;
        startSceneTimer(game, potionIntro.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: potionIntro, timer: game.sceneTimer });
        return;
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "potion-intro") {
        game.currentScene = potionRecipe;
        game.potionStartedAt = Date.now();
        for (const player of game.players.values()) player.potionAnswer = [];
        startSceneTimer(game, potionRecipe.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: publicPotionScene(), timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "potion-recipe") {
        game.currentScene = potionNegativeIntro;
        startSceneTimer(game, potionNegativeIntro.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: potionNegativeIntro, timer: game.sceneTimer });
        return;
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "potion-negative-intro") {
        game.currentScene = potionNegativeTest;
        for (const player of game.players.values()) player.negativePotionAnswer = [];
        startSceneTimer(game, potionNegativeTest.duration);
        io.to(`game_${game.id}`).emit("game:started", { scene: publicNegativePotionScene(), timer: game.sceneTimer });
        return;
    }

    if (game.gameType !== "classic" && game.currentScene?.id === "potion-negative-test") {
        game.currentScene = treeIntro;
        startSceneTimer(game, treeIntro.duration);
        io.to(`game_${game.id}`).emit("game:started", {scene:treeIntro,timer:game.sceneTimer});
        return;
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "tree-intro") {
        startTreeSpell(game);
        return;
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "tree-spell") {
        game.currentScene = treeFinale;
        startSceneTimer(game, treeFinale.duration);
        io.to(`game_${game.id}`).emit("game:started", {scene:treeFinale,timer:game.sceneTimer});
        return;
    }
    if (game.gameType !== "classic" && game.currentScene?.id === "tree-finale") {
        finishTreeGame(game);
        return;
    }
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
        
            io.to(`game_${game.id}`).emit("game:finished", {
                results,
                // Scores stay private until the final tournament scene.
                correctSuspectId: game.currentScene?.id === "snitch-theft" ? "ron" : null
            });
        
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
                broadcastHouseScores(game);
    
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
        ({ gameType } = {}) => {
            const selectedGameType = gameType === "classic" ? "classic" : "harry-potter";
    
            const gameId =
                generateGameCode();
    
            const game = {
    
                id: gameId,
                gameType: selectedGameType,
    
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
                nextHouseIndex: 0,
                adminToken: randomBytes(32).toString("hex"),
                adminSocketId: socket.id,
                houseBonuses: {},
    
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
    
            socket.emit("admin:game_created", { gameId, gameType: game.gameType, adminToken: game.adminToken });
    
        }
    );

    socket.on("admin:restore_game", ({ gameId, adminToken } = {}) => {
        const id = typeof gameId === "string" ? gameId.trim().toUpperCase() : "";
        const game = games.get(id);
        if (!game || !isValidAdminToken(game, adminToken)) {
            socket.emit("admin:restore_error", {
                message: "Игра не найдена или доступ администратора недействителен."
            });
            return;
        }
        const previous = io.sockets.sockets.get(game.adminSocketId);
        if (previous && previous.id !== socket.id) {
            previous.isAdmin = false;
            previous.leave(`game_${id}`);
        }
        socket.join(`game_${id}`);
        socket.gameId = id;
        socket.isAdmin = true;
        game.adminSocketId = socket.id;
        socket.emit("admin:game_restored", {
            gameId: id, gameType: game.gameType || "harry-potter", status: game.status, paused: game.status === "paused"
        });
        broadcastLobbyUpdate(game);
    });

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
                        house: existingPlayer.house,
                        team: existingPlayer.team,
                        gameType: game.gameType || "harry-potter",
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
                    house: game.gameType === "classic" ? null : assignNextHouse(game),
                    team: null,
                    score: 0,
                    currentChoice: null,
                    sceneState: null,
                    kicked: false
                };

                player.team = game.gameType === "classic"
                    ? ["strategist", "joker", "critic"][game.players.size % 3]
                    : player.house;
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
                        nickname: normalizedNick,
                        house: player.house,
                        team: player.team,
                        gameType: game.gameType || "harry-potter",
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

            // Обновляем данные в админке

            broadcastLobbyUpdate(game);


            const openingScene = game.gameType === "classic" ? introScene : novelScenes[1];
            game.currentScene = openingScene;
            // Both game modes use the existing shared server-side scene timer.
            startSceneTimer(game, openingScene.duration);

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
                    scene: openingScene,
                    timer: game.sceneTimer
                }
            );

            // This scene uses individual server-validated answers, not voting.

        }
    );

    // One answer per player; no score or correct answer is exposed before timeout.
    socket.on("snitch:answer", ({ suspectId } = {}) => {
        if (!socket.gameId) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" ||
            game.currentScene?.id !== "snitch-theft" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        if (!snitchScene.suspects.some(suspect => suspect.id === suspectId)) return;
        // Revisions are allowed until the shared deadline. Only the latest
        // answer counts; remove any previously awarded points before updating.
        if (player.snitchAnswer === "ron") player.score -= snitchScene.points;
        player.snitchAnswer = suspectId;
        if (suspectId === "ron") player.score += snitchScene.points;
        socket.emit("snitch:answer_saved", { suspectId });
    });

    // Authoritative scoring: green lasts one second, five times per round.
    socket.on("snitch:flight_click", () => {
        if (!socket.gameId) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "snitch-flight" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        const now = Date.now();
        if (now - (player.lastFlightClickAt || 0) < 250) return;
        player.lastFlightClickAt = now;
        const elapsed = snitchFlight.duration * 1000 - (game.sceneTimer.endsAt - now);
        const windowIndex = snitchFlight.greenWindows.findIndex(t =>
            elapsed >= t * 1000 && elapsed < t * 1000 + snitchFlight.greenDurationMs);
        let delta;
        if (windowIndex >= 0) {
            if (!player.flightCaughtWindows) player.flightCaughtWindows = new Set();
            if (player.flightCaughtWindows.has(windowIndex)) return;
            player.flightCaughtWindows.add(windowIndex);
            delta = snitchFlight.greenPoints;
        } else {
            delta = snitchFlight.redPoints;
        }
        player.score += delta;
        socket.emit("snitch:flight_result", { delta, score: player.score });
    });

    socket.on("garland:answer", ({ answerId } = {}) => {
        if (!socket.gameId || typeof answerId !== "string") return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "garland-fire" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        if (!garlandFire.options.some(option => option.id === answerId)) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        const previousCorrect = player.garlandAnswer === "incendio";
        const nextCorrect = answerId === "incendio";
        if (previousCorrect !== nextCorrect) player.score += nextCorrect ? garlandFire.points : -garlandFire.points;
        player.garlandAnswer = answerId;
        socket.emit("garland:answer_result", { answerId });
    });

    // The recipe's correct IDs are never sent to players during the selection phase.
    socket.on("tree:chat_send", ({text:message} = {}) => {
        if (!socket.gameId || typeof message !== "string") return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "tree-spell") return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        const clean = message.trim().slice(0,250);
        if (!player?.house || !game.treeTeams?.[player.house] || !clean) return;
        const entry = {nickname:player.nickname,text:clean};
        const history = game.treeChat[player.house];
        history.push(entry);
        if (history.length > 100) history.shift();
        for (const member of game.players.values()) {
            if (member.house === player.house && member.socketId)
                io.to(member.socketId).emit("tree:chat_message",entry);
        }
    });

    socket.on("tree:submit", ({ phrase } = {}) => {
        if (!socket.gameId || typeof phrase !== "string" || phrase.length > 200) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "tree-spell" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        const team = player && game.treeTeams?.[player.house];
        if (!team || team.captainId !== player.id || team.solved) return;
        if (normalizeSpell(phrase) !== normalizeSpell(TREE_SPELLS[player.house])) {
            socket.emit("tree:submit_result", {correct:false});
            return;
        }
        team.solved = true;
        for (const member of game.players.values()) if (member.house === player.house) member.score += treeSpell.points;
        io.to(`game_${game.id}`).emit("tree:house_solved", {house:player.house});
        socket.emit("tree:submit_result", {correct:true});
    });

    socket.on("potion-negative:answer", ({ optionIds } = {}) => {
        if (!socket.gameId || !Array.isArray(optionIds) || optionIds.length > 2) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "potion-negative-test" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        const validIds = new Set(potionNegativeTest.options.map(option => option.id));
        if (new Set(optionIds).size !== optionIds.length || optionIds.some(id => !validIds.has(id))) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        const correct = ids => ids.length === 2 && potionNegativeTest.correctIds.every(id => ids.includes(id));
        const wasCorrect = correct(player.negativePotionAnswer || []);
        const isCorrect = correct(optionIds);
        if (wasCorrect !== isCorrect) player.score += isCorrect ? potionNegativeTest.points : -potionNegativeTest.points;
        player.negativePotionAnswer = optionIds.slice();
        socket.emit("potion-negative:answer_result", { optionIds: player.negativePotionAnswer });
    });

    socket.on("potion:answer", ({ ingredientIds } = {}) => {
        if (!socket.gameId || !Array.isArray(ingredientIds) || ingredientIds.length > 6) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "potion-recipe" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt ||
            Date.now() < game.sceneTimer.endsAt - (potionRecipe.duration - potionRecipe.memorizeSeconds) * 1000) return;
        const valid = new Set(potionRecipe.ingredients.map(item => item.id));
        if (new Set(ingredientIds).size !== ingredientIds.length || ingredientIds.some(id => !valid.has(id))) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        const correct = ids => ids.length === 6 && potionRecipe.correctIds.every(id => ids.includes(id));
        const previousCorrect = correct(player.potionAnswer || []);
        const nextCorrect = correct(ingredientIds);
        if (previousCorrect !== nextCorrect) player.score += nextCorrect ? potionRecipe.points : -potionRecipe.points;
        player.potionAnswer = ingredientIds.slice();
        socket.emit("potion:answer_result", { ingredientIds: player.potionAnswer });
    });

    socket.on("cloak:answer", ({ zone } = {}) => {
        if (!socket.gameId || !Number.isInteger(zone) || zone < 0 || zone > 3) return;
        const game = games.get(socket.gameId);
        if (!game || game.status !== "playing" || game.currentScene?.id !== "invisibility-cloak" ||
            !game.sceneTimer || Date.now() >= game.sceneTimer.endsAt) return;
        const player = [...game.players.values()].find(p => p.socketId === socket.id);
        if (!player) return;
        const previousCorrect = player.cloakAnswer === invisibilityCloak.correctZone;
        const nextCorrect = zone === invisibilityCloak.correctZone;
        if (previousCorrect !== nextCorrect) player.score += nextCorrect ? invisibilityCloak.points : -invisibilityCloak.points;
        player.cloakAnswer = zone;
        socket.emit("cloak:answer_result", { zone });
    });

    // Developer-only scene jump. Requires the authenticated admin socket.
    socket.on("admin:jump_scene", ({ sceneId } = {}) => {
        if (!socket.isAdmin || !socket.gameId) return;
        const game = games.get(socket.gameId);
        if (game?.gameType === "classic") return;
        if (!game || game.status !== "playing") return;
        const allowed = {
            "snitch-announcement": snitchAnnouncement,
            "snitch-theft": snitchScene,
            "snitch-flight": snitchFlight,
            "garland-fire": garlandFire,
            "invisibility-cloak": invisibilityCloak,
            "potion-recipe": potionRecipe,
            "potion-intro": potionIntro,
            "potion-negative-intro": potionNegativeIntro,
            "potion-negative-test": potionNegativeTest,
            "tree-intro": treeIntro,
            "tree-spell": treeSpell,
            "tree-finale": treeFinale,
            ...Object.fromEntries(Object.entries(novelScenes).map(([n,scene]) => [scene.id,scene])),
            ...Object.fromEntries(Object.entries(novelAfterScenes).map(([n,scene]) => [scene.id,scene]))
        };
        if (!Object.prototype.hasOwnProperty.call(allowed, sceneId)) return;
        if (game.sceneTimerTimeout) clearTimeout(game.sceneTimerTimeout);
        game.sceneTimerTimeout = null;
        game.sceneTimer = null;
        game.currentScene = sceneId === "snitch-flight" ? { ...snitchFlight } : allowed[sceneId];
        if (sceneId === "potion-negative-test") {
            for (const player of game.players.values()) player.negativePotionAnswer = [];
        }
        if (sceneId === "potion-recipe") {
            for (const player of game.players.values()) player.potionAnswer = [];
        }
        if (sceneId === "invisibility-cloak") {
            for (const player of game.players.values()) player.cloakAnswer = null;
        }
        if (sceneId === "garland-fire") {
            for (const player of game.players.values()) player.garlandAnswer = null;
        }
        if (sceneId === "snitch-flight") {
            for (const player of game.players.values()) {
                player.flightCaughtWindows = new Set();
                player.lastFlightClickAt = 0;
            }
        }
        if (sceneId === "tree-spell") {
            startTreeSpell(game);
            socket.emit("admin:jump_scene_result", {sceneId});
            return;
        }
        startSceneTimer(game, game.currentScene.duration);
        io.to(`game_${game.id}`).emit("game:started", {
            scene: sceneId === "potion-recipe" ? publicPotionScene() :
                sceneId === "potion-negative-test" ? publicNegativePotionScene() : game.currentScene,
            timer: game.sceneTimer
        });
        socket.emit("admin:jump_scene_result", { sceneId });
    });

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