const { io } = require("socket.io-client");


// ============================================================
// CONFIG
// ============================================================

const args = process.argv.slice(2);

const SERVER_URL =
    args.find(
        arg =>
            arg.startsWith("http://") ||
            arg.startsWith("https://")
    ) || "http://localhost:3000";

const numericArg =
    args.find(arg => /^\d+$/.test(arg));

const PLAYER_COUNT =
    numericArg
        ? Number(numericArg)
        : 100;

const MANUAL_MODE =
    args.includes("--manual");


// ------------------------------------------------------------
// Настройки теста
// ------------------------------------------------------------

const CONNECT_DELAY_MS = 25;

const TEST_TIMEOUT_MS =
    15 * 60 * 1000;

const BOT_JOIN_TIMEOUT_MS =
    60 * 1000;


// ------------------------------------------------------------
// Reconnect
// ------------------------------------------------------------

const RECONNECT_BATCH_SIZE = 5;

const FIRST_RECONNECT_DELAY_MS =
    8000;

const NEXT_RECONNECT_DELAY_MS =
    10000;

const RECONNECT_DELAY_MS =
    5000;

const MAX_RECONNECT_WAVES = 4;


// ============================================================
// STATS
// ============================================================

const stats = {

    created: 0,

    connected: 0,
    joined: 0,

    votes: 0,

    votingStarted: 0,
    votingFinished: 0,

    disconnected: 0,

    reconnectAttempts: 0,
    reconnects: 0,
    reconnectErrors: 0,

    errors: 0,

    gameFinished: 0
};


// ============================================================
// GLOBAL STATE
// ============================================================

let gameId = null;

let gameStarted = false;

let testFinished = false;

let reconnectWave = 0;

let adminSocket = null;

let statsInterval = null;

let reconnectTimeout = null;

let testTimeout = null;

const bots = [];


// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


function logStats() {

    const connectedBots =
        bots.filter(
            bot =>
                bot.socket &&
                bot.socket.connected
        ).length;


    const joinedBots =
        bots.filter(
            bot =>
                bot.joined
        ).length;


    console.log("");

    console.log(
        "========== LOAD TEST =========="
    );

    console.log(
        `Game: ${gameId || "нет"}`
    );

    console.log(
        `Server: ${SERVER_URL}`
    );

    console.log(
        `Bots: ${PLAYER_COUNT}`
    );

    console.log(
        `Bots connected: ${connectedBots}/${bots.length}`
    );

    console.log(
        `Bots joined: ${joinedBots}/${bots.length}`
    );

    console.log(
        `Connected events: ${stats.connected}`
    );

    console.log(
        `Joined events: ${stats.joined}`
    );

    console.log(
        `Votes: ${stats.votes}`
    );

    console.log(
        `Voting started: ${stats.votingStarted}`
    );

    console.log(
        `Voting finished: ${stats.votingFinished}`
    );

    console.log(
        `Disconnected: ${stats.disconnected}`
    );

    console.log(
        `Reconnect attempts: ${stats.reconnectAttempts}`
    );

    console.log(
        `Reconnects OK: ${stats.reconnects}`
    );

    console.log(
        `Reconnect errors: ${stats.reconnectErrors}`
    );

    console.log(
        `Errors: ${stats.errors}`
    );

    console.log(
        `Game finished: ${stats.gameFinished}`
    );

    console.log(
        `Reconnect wave: ${reconnectWave}/${MAX_RECONNECT_WAVES}`
    );

    console.log(
        `Game started: ${gameStarted ? "YES" : "NO"}`
    );

    console.log(
        `Manual mode: ${MANUAL_MODE ? "YES" : "NO"}`
    );

    console.log(
        "=============================="
    );

    console.log("");
}


// ============================================================
// VOTE
// ============================================================

function voteForCurrentScene(bot, scene = null) {

    console.log(
        `[VOTE ATTEMPT] ${bot.nickname} ` +
        `connected=${bot.socket?.connected} ` +
        `scene=${scene?.id || bot.currentScene?.id || "NONE"}`
    );
    if (
        !bot.socket ||
        !bot.socket.connected
    ) {
        return;
    }

    const currentScene =
        scene || bot.currentScene;

    if (!currentScene) {
        return;
    }

    const choices =
        Array.isArray(currentScene.choices)
            ? currentScene.choices
            : [];

    if (choices.length === 0) {
        return;
    }

    const choice =
        choices[
            Math.floor(
                Math.random() * choices.length
            )
        ];

    if (!choice?.id) {
        return;
    }

    console.log(
        `${bot.nickname}: голосует за ` +
        `${choice.id} на сцене ` +
        `${currentScene.id}`
    );

    bot.socket.emit(
        "player:choice",
        {
            choiceId: choice.id
        }
    );

    stats.votes++;
}


// ============================================================
// SETUP BOT SOCKET
// ============================================================

function setupBotSocket(bot) {

    const socket =
        bot.socket;


    // --------------------------------------------------------
    // CONNECT
    // --------------------------------------------------------

    socket.on(
        "connect",
        () => {

            if (bot.isReconnect) {

                stats.reconnects++;

                console.log(
                    `RECONNECT OK: ${bot.nickname}`
                );

            } else {

                stats.connected++;

                console.log(
                    `Подключен: ${bot.nickname}`
                );
            }


            /*
             * Реальное событие твоего server.js:
             *
             * socket.on("player:join_game", ...)
             */

            socket.emit(
                "player:join_game",
                {
                    gameId,

                    nickname:
                        bot.nickname,

                    playerId:
                        bot.playerId
                }
            );
        }
    );


    // --------------------------------------------------------
    // PLAYER JOINED
    // --------------------------------------------------------

    socket.on(
        "player:joined",
        data => {

            /*
             * ЭТО ОСНОВНОЕ ПОДТВЕРЖДЕНИЕ ВХОДА.
             *
             * Именно это событие реально отправляет
             * твой server.js.
             */

            if (!bot.joined) {

                bot.joined = true;

                stats.joined++;

                console.log(
                    `Игрок вошёл: ${bot.nickname} ` +
                    `(${stats.joined}/${bots.length})`
                );
            }


            if (
                data &&
                data.restored
            ) {

                console.log(
                    `Восстановлено соединение: ` +
                    `${bot.nickname}`
                );
            }
        }
    );


    // --------------------------------------------------------
    // JOIN ERROR
    // --------------------------------------------------------

    socket.on(
        "player:join_error",
        data => {

            stats.errors++;

            console.error(
                `${bot.nickname}: ` +
                `JOIN ERROR: ` +
                `${data?.message || "unknown error"}`
            );
        }
    );


    // --------------------------------------------------------
    // GAME STARTED
    // --------------------------------------------------------

    socket.on(
        "game:started",
        data => {

            if (!data) {
                return;
            }


            if (data.scene) {

                bot.currentScene =
                    data.scene;
            }


            console.log(
                `${bot.nickname}: ` +
                `сцена ${data.scene?.id || "unknown"}`
            );
        }
    );


    // --------------------------------------------------------
    // VOTING STARTED
    // --------------------------------------------------------

    socket.on(
        "voting:started",
        data => {
    
            console.log(
                `[VOTING EVENT] ${bot.nickname} ` +
                `connected=${socket.connected} ` +
                `scene=${data?.scene?.id || "NO_SCENE"}`
            );

            stats.votingStarted++;
    
            const votingScene =
                data?.scene || bot.currentScene;
    
            if (!votingScene) {
    
                console.log(
                    `${bot.nickname}: ` +
                    `voting:started, но сцена неизвестна`
                );
    
                return;
            }
    
            bot.currentScene =
                votingScene;
    
            console.log(
                `${bot.nickname}: ` +
                `голосование началось для сцены ` +
                `${votingScene.id}`
            );
    
            setTimeout(
                () => {
    
                    voteForCurrentScene(
                        bot,
                        votingScene
                    );
    
                },
                50 +
                Math.floor(
                    Math.random() * 500
                )
            );
        }
    );


    // --------------------------------------------------------
    // VOTING FINISHED
    // --------------------------------------------------------

    socket.on(
        "voting:finished",
        data => {

            stats.votingFinished++;

            console.log(
                `${bot.nickname}: ` +
                `голосование завершено, ` +
                `winner=${data?.winner || "null"}`
            );
        }
    );


    // --------------------------------------------------------
    // RESTORE STATE
    // --------------------------------------------------------

    socket.on(
        "player:restore_state",
        data => {

            if (!data) {
                return;
            }


            /*
             * Твой server.js отправляет:
             *
             * scene: game.currentScene
             *
             * Поэтому здесь сохраняем сцену.
             */

            if (
                data.scene &&
                typeof data.scene === "object"
            ) {

                bot.currentScene =
                    data.scene;
            }


            /*
             * player:restore_state используется
             * при reconnect.
             *
             * Сам вход при этом подтверждается
             * отдельным player:joined.
             */
        }
    );


    // --------------------------------------------------------
    // PLAYER CHOICE RESULT
    // --------------------------------------------------------

    socket.on(
        "player:choice_result",
        data => {

            /*
             * Сервер подтвердил принятие голоса.
             *
             * Ничего дополнительно делать не нужно.
             */
        }
    );


    // --------------------------------------------------------
    // GAME PAUSED
    // --------------------------------------------------------

    socket.on(
        "game:paused",
        data => {

            console.log(
                `${bot.nickname}: ` +
                `игра поставлена на паузу`
            );
        }
    );


    // --------------------------------------------------------
    // GAME RESUMED
    // --------------------------------------------------------

    socket.on(
        "game:resumed",
        data => {

            console.log(
                `${bot.nickname}: ` +
                `игра продолжена`
            );
        }
    );


    // --------------------------------------------------------
    // VOTING RESUMED
    // --------------------------------------------------------

    socket.on(
        "voting:resumed",
        data => {

            /*
             * При resume голосование продолжается.
             *
             * Если бот уже проголосовал,
             * повторно голосовать не обязательно.
             */
        }
    );


    // --------------------------------------------------------
    // GAME FINISHED
    // --------------------------------------------------------

    socket.on(
        "game:finished",
        data => {

            stats.gameFinished++;

            console.log(
                `${bot.nickname}: ` +
                `GAME FINISHED`
            );


            if (!testFinished) {

                finishTest();
            }
        }
    );


    // --------------------------------------------------------
    // CONNECT ERROR
    // --------------------------------------------------------

    socket.on(
        "connect_error",
        error => {

            stats.errors++;

            if (bot.isReconnect) {

                stats.reconnectErrors++;
            }


            console.error(
                `${bot.nickname}: ` +
                `connect_error: ` +
                `${error.message}`
            );
        }
    );


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    socket.on(
        "error",
        error => {

            stats.errors++;

            console.error(
                `${bot.nickname}: socket error:`,
                error
            );
        }
    );


    // --------------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------------

    socket.on(
        "disconnect",
        reason => {

            stats.disconnected++;

            console.log(
                `Отключение: ` +
                `${bot.nickname} ` +
                `(${reason})`
            );
        }
    );
}


// ============================================================
// CREATE BOT
// ============================================================

function createBot(index) {

    const nickname =
        `LoadBot_${String(index).padStart(3, "0")}`;


    const playerId =
        `load-test-${index}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;


    const bot = {

        index,

        nickname,

        playerId,

        socket: null,

        currentScene: null,

        joined: false,

        isReconnect: false,

        reconnecting: false,

        reconnected: false
    };


    bots.push(bot);


    return bot;
}


// ============================================================
// CONNECT BOT
// ============================================================

function connectBot(
    bot,
    isReconnect = false
) {

    bot.isReconnect =
        isReconnect;


    const socket =
        io(
            SERVER_URL,
            {
                transports: [
                    "websocket"
                ],

                /*
                 * Нам нужен ручной reconnect,
                 * чтобы контролировать нагрузку.
                 */

                reconnection: false
            }
        );


    bot.socket =
        socket;


    setupBotSocket(bot);


    return socket;
}


// ============================================================
// CREATE GAME
// ============================================================

function createGame() {

    return new Promise(
        (resolve, reject) => {

            console.log("");

            console.log(
                "Создаём игру..."
            );


            adminSocket =
                io(
                    SERVER_URL,
                    {
                        transports: [
                            "websocket"
                        ],

                        reconnection: false
                    }
                );


            let finished = false;


            const timeout =
                setTimeout(
                    () => {

                        if (finished) {
                            return;
                        }

                        finished = true;

                        reject(
                            new Error(
                                "Timeout при создании игры"
                            )
                        );

                    },
                    15000
                );


            adminSocket.on(
                "connect",
                () => {

                    console.log(
                        "Admin подключён"
                    );


                    adminSocket.emit(
                        "admin:create_game"
                    );
                }
            );


            /*
             * Именно это событие отправляет
             * твой server.js.
             */

            adminSocket.on(
                "admin:game_created",
                data => {

                    if (finished) {
                        return;
                    }


                    if (
                        !data ||
                        !data.gameId
                    ) {

                        finished = true;

                        clearTimeout(
                            timeout
                        );

                        reject(
                            new Error(
                                "admin:game_created " +
                                "не содержит gameId"
                            )
                        );

                        return;
                    }


                    finished = true;

                    clearTimeout(
                        timeout
                    );


                    gameId =
                        data.gameId;


                    stats.created++;


                    console.log("");

                    console.log(
                        "========================================"
                    );

                    console.log(
                        "GAME CREATED"
                    );

                    console.log(
                        `Game ID: ${gameId}`
                    );

                    console.log(
                        "========================================"
                    );

                    console.log("");


                    resolve(
                        gameId
                    );
                }
            );


            adminSocket.on(
                "connect_error",
                error => {

                    if (finished) {
                        return;
                    }


                    finished = true;

                    clearTimeout(
                        timeout
                    );


                    reject(error);
                }
            );
        }
    );
}


// ============================================================
// CONNECT BOTS
// ============================================================

async function connectBots() {

    console.log("");

    console.log(
        `Подключаем ${PLAYER_COUNT} ботов...`
    );


    for (
        let i = 1;
        i <= PLAYER_COUNT;
        i++
    ) {

        const bot =
            createBot(i);


        connectBot(
            bot,
            false
        );


        await sleep(
            CONNECT_DELAY_MS
        );
    }


    console.log("");

    console.log(
        "Все подключения отправлены."
    );
}


// ============================================================
// WAIT FOR BOTS
// ============================================================

async function waitForBots() {

    console.log("");

    console.log(
        "Ждём подтверждение входа ботов..."
    );


    const startedAt =
        Date.now();


    while (
        Date.now() - startedAt <
        BOT_JOIN_TIMEOUT_MS
    ) {

        const joined =
            bots.filter(
                bot =>
                    bot.joined
            ).length;


        console.log(
            `Bots joined: ` +
            `${joined}/${bots.length}`
        );


        if (
            joined >= bots.length
        ) {

            console.log("");

            console.log(
                "Все боты успешно вошли в игру."
            );

            return true;
        }


        await sleep(1000);
    }


    const joined =
        bots.filter(
            bot =>
                bot.joined
        ).length;


    console.error("");

    console.error(
        "========================================"
    );

    console.error(
        "ОШИБКА: не все боты вошли в игру."
    );

    console.error(
        `Успешно вошло: ${joined}/${bots.length}`
    );

    console.error(
        "========================================"
    );


    return false;
}


// ============================================================
// MANUAL PLAYER
// ============================================================

async function waitForManualPlayer() {

    if (!MANUAL_MODE) {
        return;
    }


    console.log("");

    console.log(
        "=================================================="
    );

    console.log(
        "                 MANUAL MODE"
    );

    console.log(
        "=================================================="
    );

    console.log("");

    console.log(
        `Game ID: ${gameId}`
    );

    console.log("");

    console.log(
        "Теперь открой игру в браузере."
    );

    console.log(
        `Введи код игры: ${gameId}`
    );

    console.log("");

    console.log(
        "Зайди как обычный игрок."
    );

    console.log(
        "Выбери ник и команду."
    );

    console.log("");

    console.log(
        "После того как ты окажешься в лобби,"
    );

    console.log(
        "вернись сюда и нажми ENTER."
    );

    console.log("");

    console.log(
        "=================================================="
    );

    console.log("");


    /*
     * Ждём Enter.
     */

    await new Promise(
        resolve => {

            process.stdin.resume();

            process.stdin.setEncoding(
                "utf8"
            );


            process.stdin.once(
                "data",
                () => {

                    resolve();
                }
            );
        }
    );


    console.log("");

    console.log(
        "ENTER получен."
    );

    console.log(
        "Запускаем игру..."
    );

    console.log("");
}


// ============================================================
// START GAME
// ============================================================

function startGame() {

    return new Promise(
        (resolve, reject) => {

            if (!adminSocket) {

                reject(
                    new Error(
                        "Admin socket отсутствует"
                    )
                );

                return;
            }


            let resolved = false;


            const finish =
                () => {

                    if (resolved) {
                        return;
                    }


                    resolved = true;

                    gameStarted = true;


                    console.log("");

                    console.log(
                        "========================================"
                    );

                    console.log(
                        "GAME STARTED"
                    );

                    console.log(
                        "========================================"
                    );

                    console.log("");


                    resolve();
                };


            /*
             * ВАЖНО:
             *
             * Твой server.js НЕ отправляет
             * admin:game_started.
             *
             * admin:start_game запускает игру,
             * а game:started отправляется всем
             * участникам комнаты.
             *
             * Поэтому просто ждём небольшую паузу
             * после команды запуска.
             */

            adminSocket.emit(
                "admin:start_game"
            );


            /*
             * Даём серверу время обработать команду
             * и отправить game:started.
             */

            setTimeout(
                () => {

                    finish();

                },
                1000
            );


            setTimeout(
                () => {

                    if (!resolved) {

                        reject(
                            new Error(
                                "Не удалось запустить игру"
                            )
                        );
                    }

                },
                10000
            );
        }
    );
}


// ============================================================
// RECONNECT ONE BOT
// ============================================================

async function reconnectBot(bot) {

    if (
        bot.reconnecting ||
        bot.reconnected
    ) {
        return;
    }


    bot.reconnecting =
        true;


    stats.reconnectAttempts++;


    console.log("");

    console.log(
        `RECONNECT START: ${bot.nickname}`
    );


    /*
     * Сохраняем тот же playerId.
     *
     * Это очень важно, потому что server.js
     * ищет существующего игрока:
     *
     * game.players.get(normalizedPlayerId)
     *
     * и восстанавливает его.
     */


    if (
        bot.socket &&
        bot.socket.connected
    ) {

        bot.socket.disconnect();
    }


    await sleep(
        RECONNECT_DELAY_MS
    );


    if (testFinished) {

        bot.reconnecting =
            false;

        return;
    }


    connectBot(
        bot,
        true
    );


    bot.reconnected =
        true;


    bot.reconnecting =
        false;
}


// ============================================================
// RECONNECT WAVE
// ============================================================

async function runReconnectWave() {

    if (
        testFinished ||
        !gameStarted
    ) {
        return;
    }


    if (
        reconnectWave >=
        MAX_RECONNECT_WAVES
    ) {

        console.log("");

        console.log(
            "Все reconnect waves выполнены."
        );

        return;
    }


    reconnectWave++;


    /*
     * Берём только ещё не reconnect-нутых ботов.
     *
     * Поэтому один и тот же бот не будет
     * отключаться много раз.
     */

    const candidates =
        bots.filter(
            bot =>
                !bot.reconnecting &&
                !bot.reconnected &&
                bot.socket &&
                bot.socket.connected
        );


    const selected =
        candidates.slice(
            0,
            RECONNECT_BATCH_SIZE
        );


    if (
        selected.length === 0
    ) {

        console.log(
            "Нет доступных ботов для reconnect."
        );

        return;
    }


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        `RECONNECT WAVE ` +
        `${reconnectWave}/${MAX_RECONNECT_WAVES}`
    );

    console.log(
        `Отключаем ${selected.length} ботов`
    );

    console.log(
        "========================================"
    );


    for (
        const bot of selected
    ) {

        reconnectBot(bot);

        await sleep(200);
    }


    /*
     * Следующая волна.
     */

    if (
        reconnectWave <
        MAX_RECONNECT_WAVES
    ) {

        reconnectTimeout =
            setTimeout(
                () => {

                    runReconnectWave();

                },
                NEXT_RECONNECT_DELAY_MS
            );
    }
}


// ============================================================
// FINISH TEST
// ============================================================

function finishTest() {

    if (testFinished) {
        return;
    }


    testFinished = true;


    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "LOAD TEST FINISHED"
    );

    console.log(
        "========================================"
    );


    logStats();


    cleanup();
}


// ============================================================
// CLEANUP
// ============================================================

function cleanup() {

    if (statsInterval) {

        clearInterval(
            statsInterval
        );

        statsInterval = null;
    }


    if (reconnectTimeout) {

        clearTimeout(
            reconnectTimeout
        );

        reconnectTimeout = null;
    }


    if (testTimeout) {

        clearTimeout(
            testTimeout
        );

        testTimeout = null;
    }


    /*
     * Закрываем всех ботов.
     */

    for (
        const bot of bots
    ) {

        if (bot.socket) {

            try {

                bot.socket.disconnect();

            } catch (error) {

                // ignore
            }
        }
    }


    /*
     * Закрываем admin socket.
     */

    if (adminSocket) {

        try {

            adminSocket.disconnect();

        } catch (error) {

            // ignore
        }
    }


    console.log("");

    console.log(
        "Все sockets закрыты."
    );


    process.exit(0);
}


// ============================================================
// ERROR HANDLING
// ============================================================

process.on(
    "uncaughtException",
    error => {

        console.error("");

        console.error(
            "UNCAUGHT EXCEPTION:"
        );

        console.error(
            error
        );

        stats.errors++;
    }
);


process.on(
    "unhandledRejection",
    error => {

        console.error("");

        console.error(
            "UNHANDLED REJECTION:"
        );

        console.error(
            error
        );

        stats.errors++;
    }
);


process.on(
    "SIGINT",
    () => {

        console.log("");

        console.log(
            "Получен Ctrl+C."
        );

        finishTest();
    }
);


// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log("");

    console.log(
        "========================================"
    );

    console.log(
        "       SOCKET.IO LOAD TEST"
    );

    console.log(
        "========================================"
    );

    console.log(
        `Server: ${SERVER_URL}`
    );

    console.log(
        `Bots: ${PLAYER_COUNT}`
    );

    console.log(
        `Manual mode: ` +
        `${MANUAL_MODE ? "YES" : "NO"}`
    );

    console.log(
        "========================================"
    );


    /*
     * Общий timeout теста.
     */

    testTimeout =
        setTimeout(
            () => {

                console.log("");

                console.log(
                    "TIMEOUT: тест превысил " +
                    "10 минут."
                );

                finishTest();

            },
            TEST_TIMEOUT_MS
        );


    /*
     * Статистика каждые 10 секунд.
     */

    statsInterval =
        setInterval(
            () => {

                logStats();

            },
            10000
        );


    // --------------------------------------------------------
    // 1. CREATE GAME
    // --------------------------------------------------------

    await createGame();


    // --------------------------------------------------------
    // 2. CONNECT BOTS
    // --------------------------------------------------------

    await connectBots();


    // --------------------------------------------------------
    // 3. WAIT FOR PLAYER:JOINED
    // --------------------------------------------------------

    const allBotsJoined =
        await waitForBots();


    if (!allBotsJoined) {

        console.error("");

        console.error(
            "Тест остановлен, потому что " +
            "не все боты вошли в игру."
        );

        finishTest();

        return;
    }


    // --------------------------------------------------------
    // 4. MANUAL PLAYER
    // --------------------------------------------------------

    if (MANUAL_MODE) {

        await waitForManualPlayer();
    }


    // --------------------------------------------------------
    // 5. START GAME
    // --------------------------------------------------------

    await startGame();


    // --------------------------------------------------------
    // 6. RECONNECT WAVES
    // --------------------------------------------------------
/*
    reconnectTimeout =
        setTimeout(
            () => {

                runReconnectWave();

            },
            FIRST_RECONNECT_DELAY_MS
        );
*/

    // --------------------------------------------------------
    // 7. WAIT FOR GAME FINISHED
    // --------------------------------------------------------

    console.log("");

    console.log(
        "Тест запущен."
    );

    console.log(
        "Ожидаем game:finished..."
    );

    console.log("");
}


// ============================================================
// RUN
// ============================================================

main()
    .catch(
        error => {

            console.error("");

            console.error(
                "LOAD TEST ERROR:"
            );

            console.error(
                error
            );

            cleanup();
        }
    );