const socket = io();

// ==================================================
// VOICE
// ==================================================
let voiceEnabled =
    localStorage.getItem("starTestQuest_voiceEnabled") !== "false";
let currentScene = null;
let currentVoice = null;
let isGamePaused = false;

let bugSearchState = {
    mistakes: 0,
    found: 0,
    finished: false,
    cards: []
};

function playVoice(src) {

    // Всегда сначала останавливаем предыдущую озвучку
    stopVoice();

    // Озвучка выключена
    if (!voiceEnabled) {
        return;
    }

    // У сцены нет озвучки
    if (!src) {
        return;
    }

    currentVoice =
        new Audio(src);

    currentVoice.volume = 1;

    currentVoice.play()
        .catch(error => {

            console.warn(
                "Не удалось запустить озвучку:",
                error
            );

        });
}

// ==================================================
// PLAYER ID
// ==================================================

let playerId =
    localStorage.getItem(
        "starTestQuest_playerId"
    );
let isRestoringGame = false;
let isRestoredSession = false;
if (!playerId) {

    playerId =
        (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        )
            ? crypto.randomUUID()
            : "player-" +
              Date.now() +
              "-" +
              Math.random()
                  .toString(36)
                  .substring(2, 10);

    localStorage.setItem(
        "starTestQuest_playerId",
        playerId
    );
}

let savedNickname =
    localStorage.getItem(
        "starTestQuest_nickname"
    );


console.log(
    "Player ID:",
    playerId
);

console.log("app.js загружен");

document.addEventListener(
    "click",
    () => {

        // При восстановлении игры приветственная
        // озвучка больше не должна запускаться.
        if (isRestoredSession) {
            return;
        }

        if (!welcomeVoice) {
            return;
        }

        if (!voiceEnabled) {
            return;
        }

        welcomeVoice.play()
            .catch(
                error => {
                    console.log(
                        "Не удалось запустить озвучку:",
                        error
                    );
                }
            );

    },
    {
        once: true
    }
);

// ==================================================
// ELEMENTS
// ==================================================
const resultsScreen =
    document.getElementById("resultsScreen");

const resultsList =
    document.getElementById("resultsList");

const sceneTimer =
    document.getElementById("sceneTimer");

const dialoguePanel =
    document.getElementById("dialoguePanel");

const bugSearch =
    document.getElementById("bugSearch");

const bugCards =
    document.getElementById("bugCards");

const bugSearchTitle =
    document.getElementById("bugSearchTitle");

const bugSearchTimer =
    document.getElementById("bugSearchTimer");

const bugSearchStatus =
    document.getElementById("bugSearchStatus");

const sceneTransition =
    document.getElementById(
        "sceneTransition"
    );

const charactersLayer =
    document.getElementById(
        "charactersLayer"
    );

const sceneTransitionTitle =
    document.getElementById(
        "sceneTransitionTitle"
    );

const sceneTransitionText =
    document.getElementById(
        "sceneTransitionText"
    );

const sceneTransitionNext =
    document.getElementById(
        "sceneTransitionNext"
    );

const voiceToggle =
    document.getElementById(
        "voiceToggle"
    );

const welcomeVoice =
    document.getElementById(
        "welcomeVoice"
    );

const teamVoice =
    document.getElementById(
        "teamVoice"
    );

const kickedScreen =
    document.getElementById(
        "kickedScreen"
    );

const kickedMessage =
    document.getElementById(
        "kickedMessage"
    );

const returnToStartButton =
    document.getElementById(
        "returnToStartButton"
    );

const joinScreen =
    document.getElementById("joinScreen");

const lobbyScreen =
    document.getElementById("lobbyScreen");

const teamScreen =
    document.getElementById("teamScreen");

const waitingScreen =
    document.getElementById("waitingScreen");

const gameScreen =
    document.getElementById("gameScreen");

const gameBackground =
    document.getElementById(
        "gameBackground"
    );

const dialogueText =
    document.getElementById(
        "dialogueText"
    );

const choiceButtons =
    document.getElementById(
        "choiceButtons"
    );

const nicknameInput =
    document.getElementById("nickname");

const joinButton =
    document.getElementById("joinButton");

const errorElement =
    document.getElementById("error");

const playerNickname =
    document.getElementById("playerNickname");

const lobbyPlayerCount =
    document.getElementById("lobbyPlayerCount");

const teamStatus =
    document.getElementById("teamStatus");


const teamButtons =
    document.querySelectorAll(".team-button");

const characterName =
    document.getElementById("characterName");   // <-- добавляем

// ==================================================
// GAME CODE FROM URL
// ==================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const gameId =
    params.get("game");

isRestoringGame =
    Boolean(
        gameId &&
        playerId &&
        savedNickname
    );

isRestoredSession = isRestoringGame;


console.log(
    "Код игры:",
    gameId
);

// ==================================================
// PAUSE OVERLAY
// ==================================================

let pauseOverlay = null;

function createPauseOverlay() {

    if (pauseOverlay) {
        return;
    }

    pauseOverlay = document.createElement("div");

    pauseOverlay.id = "gamePauseOverlay";

    pauseOverlay.innerHTML = `
        <div class="pause-overlay-content">
            <div class="pause-icon">
                ⏸️
            </div>

            <div class="pause-title">
                ИГРА НА ПАУЗЕ
            </div>

            <div class="pause-text">
                Администратор временно приостановил игру
            </div>

            <div class="pause-waiting">
                Пожалуйста, подождите...
            </div>
        </div>
    `;

    document.body.appendChild(
        pauseOverlay
    );
}


function showGamePause() {

    createPauseOverlay();

    isGamePaused = true;

    pauseOverlay.classList.remove(
        "hidden"
    );

    requestAnimationFrame(() => {

        pauseOverlay.classList.add(
            "active"
        );

    });

    // Останавливаем локальный таймер
    pauseSceneTimer();

    // Останавливаем озвучку
    stopVoice();

    // Блокируем игровые кнопки
    if (choiceButtons) {

        choiceButtons
            .querySelectorAll("button")
            .forEach(button => {
                button.disabled = true;
            });

    }

    const bugButtons =
        document.querySelectorAll(
            "#bugButton, #normalButton"
        );

    bugButtons.forEach(button => {
        button.disabled = true;
    });
}


function hideGamePause() {

    createPauseOverlay();

    isGamePaused = false;

    pauseOverlay.classList.remove(
        "active"
    );

    setTimeout(() => {

        if (!isGamePaused) {

            pauseOverlay.classList.add(
                "hidden"
            );

        }

    }, 300);
}

function updateSceneTimer(seconds) {

    if (!sceneTimer) {
        return;
    }

    seconds =
        Math.max(
            0,
            Math.ceil(seconds)
        );

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    sceneTimer.textContent =
        `⏱ ${minutes}:${String(
            remainingSeconds
        ).padStart(2, "0")}`;

}
// ==================================================
// ShowTrasitionScene
// ==================================================

function showSceneTransition({
    title = "ВЫБОР СДЕЛАН",
    text = "",
    nextText = ""
} = {}) {

    if (!sceneTransition) {
        return;
    }

    stopVoice();

    sceneTransitionTitle.textContent = title;
    sceneTransitionText.textContent = text;
    sceneTransitionNext.textContent = nextText;

    // Игровую сцену НЕ скрываем.
    // Она остаётся на фоне.

    sceneTransition.classList.remove("hidden");

    // Запускаем визуальный эффект перехода
    requestAnimationFrame(() => {
        sceneTransition.classList.add("active");
    });
}

// ==================================================
// MARK SELECTED BUTTON
// ==================================================
function markSelectedButton(button, containerSelector = null) {

    if (!button) {
        return;
    }

    const container =
        containerSelector
            ? button.closest(containerSelector)
            : button.closest(
                ".choice-buttons, .team-buttons"
            );

    if (!container) {
        return;
    }

    container
        .querySelectorAll("button")
        .forEach(btn => {
            btn.classList.remove("selected");
        });

    button.classList.add("selected");
}

// ==================================================
// HideTrasitionScene
// ==================================================
function hideSceneTransition() {

    if (!sceneTransition) {
        return;
    }

    sceneTransition.classList.remove("active");

    setTimeout(() => {

        sceneTransition.classList.add("hidden");

    }, 600);
}

// ==================================================
// trasitioToScene
// ==================================================
function transitionToScene(callback) {

    if (!sceneTransition) {
        callback();
        return;
    }

    // Показываем затемнение
    sceneTransition.classList.remove("hidden");

    requestAnimationFrame(() => {

        sceneTransition.classList.add("active");

    });

    // Ждём полного затемнения
    setTimeout(() => {

        // Меняем содержимое сцены
        callback();

        // Небольшая пауза,
        // чтобы новая сцена успела отрисоваться
        setTimeout(() => {

            sceneTransition.classList.remove("active");

            // После fade-out полностью убираем overlay
            setTimeout(() => {

                sceneTransition.classList.add("hidden");

            }, 600);

        }, 100);

    }, 600);

}

// ==================================================
// RENDER BUG SEARCH
// ==================================================
function renderBugSearchScene(scene, savedState = null) {

    console.log(
        "Запускаем сцену поиска багов:",
        scene
    );

    // Убираем персонажей предыдущей сцены
    if (charactersLayer) {
        charactersLayer.innerHTML = "";
    }
    // ------------------------------------------
    // СОСТОЯНИЕ
    // ------------------------------------------
    bugSearchState = {

        mistakes:
            savedState?.mistakes || 0,
    
        found:
            savedState?.found || 0,
    
        finished:
            savedState?.finished || false,
    
        cards:
            scene.cards || [],
    
        currentIndex:
            savedState?.currentIndex || 0,
    
        scene:
            scene
    
    };


    // ------------------------------------------
    // ПОКАЗЫВАЕМ BUG SEARCH
    // ------------------------------------------

    const bugSearch =
        document.getElementById(
            "bugSearch"
        );


    if (!bugSearch) {

        console.error(
            "Не найден #bugSearch"
        );

        return;
    }


    bugSearch.classList.remove(
        "hidden"
    );


    // ------------------------------------------
    // СКРЫВАЕМ НИЖНЮЮ ПАНЕЛЬ
    // ------------------------------------------

    if (dialoguePanel) {

        dialoguePanel.classList.add(
            "hidden"
        );

    }


    // ------------------------------------------
    // ЭЛЕМЕНТЫ
    // ------------------------------------------

    const image =
        document.getElementById(
            "bugSearchImage"
        );


    const current =
        document.getElementById(
            "bugSearchCurrent"
        );


    const total =
        document.getElementById(
            "bugSearchTotal"
        );


    const status =
        document.getElementById(
            "bugSearchStatus"
        );


    const bugButton =
        document.getElementById(
            "bugButton"
        );


    const normalButton =
        document.getElementById(
            "normalButton"
        );


    // ------------------------------------------
    // КОЛИЧЕСТВО КАРТОЧЕК
    // ------------------------------------------

    if (total) {

        total.textContent =
            bugSearchState.cards.length;

    }


    // ------------------------------------------
    // СТАТУС
    // ------------------------------------------

    if (status) {

        status.textContent =
            "Внимательно осмотри предмет и найди баг.";

    }


    // ------------------------------------------
    // КНОПКИ
    // ------------------------------------------

    bugButton.onclick =
        () => {

            answerBugSearch(
                true
            );

        };


    normalButton.onclick =
        () => {

            answerBugSearch(
                false
            );

        };


    // ------------------------------------------
    // ПОКАЗЫВАЕМ ПЕРВУЮ КАРТИНКУ
    // ------------------------------------------

    showBugSearchCard();


    // ------------------------------------------
    // ОЗВУЧКА
    // ------------------------------------------

    playVoice(
        scene.voice
    );
}

function showBugSearchCard() {

    if (
        bugSearchState.finished
    ) {

        return;
    }


    const cards =
        bugSearchState.cards;


    const index =
        bugSearchState.currentIndex;


    if (
        index >= cards.length
    ) {

        finishBugSearch();

        return;
    }


    const card =
        cards[index];


    const image =
        document.getElementById(
            "bugSearchImage"
        );


    const current =
        document.getElementById(
            "bugSearchCurrent"
        );


    const status =
        document.getElementById(
            "bugSearchStatus"
        );


    const bugButton =
        document.getElementById(
            "bugButton"
        );


    const normalButton =
        document.getElementById(
            "normalButton"
        );


    // ------------------------------------------
    // ОБНОВЛЯЕМ НОМЕР
    // ------------------------------------------

    if (current) {

        current.textContent =
            index + 1;

    }


    // ------------------------------------------
    // БЛОКИРУЕМ КНОПКИ
    // ------------------------------------------

    bugButton.disabled =
        false;

    normalButton.disabled =
        false;


    // ------------------------------------------
    // СБРАСЫВАЕМ СТАТУС
    // ------------------------------------------

    if (status) {

        status.textContent =
            "Внимательно осмотри предмет.";

    }


    // ------------------------------------------
    // ПЛАВНАЯ СМЕНА КАРТИНКИ
    // ------------------------------------------

    image.style.opacity = "0";


    setTimeout(
        () => {

            image.src =
                card.image;


            image.onload =
                () => {

                    image.style.opacity =
                        "1";

                };

        },
        150
    );

}

function answerBugSearch(isBug) {

    if (
        bugSearchState.finished
    ) {

        return;
    }


    const card =
        bugSearchState.cards[
            bugSearchState.currentIndex
        ];


    if (!card) {

        return;
    }


    const bugButton =
        document.getElementById(
            "bugButton"
        );


    const normalButton =
        document.getElementById(
            "normalButton"
        );


    bugButton.disabled =
        true;

    normalButton.disabled =
        true;


    socket.emit(
        "bugsearch:card_selected",
        {
            cardId: card.id,

            answer:
                isBug
                    ? "bug"
                    : "no_bug"
                    }
    );

}

// ==================================================
// SEND CLICK TO SERVER
// ==================================================
function selectBugCard(cardId) {

    if (bugSearchState.finished) {
        return;
    }

    const buttons =
        document.querySelectorAll(".bug-card");

    buttons.forEach(button => {
        button.disabled = true;
    });

    socket.emit(
        "bugsearch:card_selected",
        {
            cardId
        }
    );
}

function renderBugSearchStatus() {

    const status =
        document.getElementById(
            "bugSearchStatus"
        );

    if (!status) {
        return;
    }

    status.textContent =
        `Найдено багов: ${bugSearchState.found}/3 | ` +
        `Ошибки: ${bugSearchState.mistakes}/2`;
}

// ==================================================
// CURRENT VOICE
// ==================================================


function stopVoice() {

    if (!currentVoice) {
        return;
    }

    currentVoice.pause();
    currentVoice.currentTime = 0;
    currentVoice = null;
}

function updateVoiceToggle() {

    if (!voiceToggle) {
        return;
    }

    if (voiceEnabled) {

        voiceToggle.textContent =
            "🔊 Озвучка: ВКЛ";

    } else {

        voiceToggle.textContent =
            "🔇 Озвучка: ВЫКЛ";

    }

}

updateVoiceToggle();

voiceToggle.addEventListener(
    "click",
    () => {

        voiceEnabled =
            !voiceEnabled;


        localStorage.setItem(
            "starTestQuest_voiceEnabled",
            voiceEnabled
        );


        updateVoiceToggle();


        if (!voiceEnabled) {

            // Останавливаем стартовую озвучку
            if (welcomeVoice) {
        
                welcomeVoice.pause();
                welcomeVoice.currentTime = 0;
        
            }
        
            // Останавливаем озвучку текущей сцены
            stopVoice();
        
        }

    }
);

// ==================================================
// SCENE TIMER
// ==================================================

let sceneTimerInterval = null;
let sceneTimerEndsAt = null;
let sceneTimerRemainingMs = null;

function startSceneTimer(endsAt) {

    if (!sceneTimer) {
        return;
    }

    // Останавливаем предыдущий таймер
    if (sceneTimerInterval) {
        clearInterval(sceneTimerInterval);
        sceneTimerInterval = null;
    }

    sceneTimerEndsAt = endsAt;
    sceneTimerRemainingMs = null;
    function updateSceneTimer() {

        const remaining =
            Math.max(
                0,
                sceneTimerEndsAt - Date.now()
            );

        renderSceneTimerRemaining(remaining);

        if (remaining <= 0) {

            clearInterval(
                sceneTimerInterval
            );

            sceneTimerInterval = null;

            sceneTimer.textContent =
                "⏱ 0:00";
        }
    }

    updateSceneTimer();

    sceneTimerInterval =
        setInterval(
            updateSceneTimer,
            250
        );
}

function pauseSceneTimer() {

    // Если таймер уже не запущен —
    // ничего не делаем.
    if (!sceneTimerEndsAt) {
        return;
    }

    // Запоминаем оставшееся время.
    sceneTimerRemainingMs =
        Math.max(
            0,
            sceneTimerEndsAt - Date.now()
        );

    // Останавливаем интервал.
    if (sceneTimerInterval) {

        clearInterval(sceneTimerInterval);

        sceneTimerInterval = null;
    }

    // Таймер больше не должен продолжать
    // отсчитываться от старого endsAt.
    sceneTimerEndsAt = null;

    // Показываем зафиксированное время.
    renderSceneTimerRemaining(
        sceneTimerRemainingMs
    );
}

function renderSceneTimerRemaining(milliseconds) {

    if (!sceneTimer) {
        return;
    }

    const seconds =
        Math.max(
            0,
            Math.ceil(milliseconds / 1000)
        );

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        seconds % 60;

    sceneTimer.textContent =
        `⏱ ${minutes}:${String(secs).padStart(2, "0")}`;
}

function stopSceneTimer() {

    if (sceneTimerInterval) {

        clearInterval(sceneTimerInterval);

        sceneTimerInterval = null;
    }

    sceneTimerEndsAt = null;
    sceneTimerRemainingMs = null;

    if (sceneTimer) {
        sceneTimer.textContent = "⏱ 0:00";
    }
}

// ==================================================
// SOCKET CONNECTION
// ==================================================

socket.on(
    "connect",
    () => {

        console.log(
            "Socket подключён:",
            socket.id
        );

        if (
            gameId &&
            playerId &&
            savedNickname
        ) {

            console.log(
                "Пробуем восстановить игрока:",
                {
                    gameId,
                    playerId,
                    nickname: savedNickname
                }
            );

            isRestoringGame = true;

            socket.emit(
                "player:join_game",
                {
                    gameId,
                    nickname: savedNickname,
                    playerId
                }
            );

        }

    }
);


// ==================================================
// JOIN GAME
// ==================================================

joinButton.addEventListener(
    "click",
    joinGame
);


nicknameInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            joinGame();

        }

    }
);

function joinGame() {

    console.log(
        "Попытка входа в игру"
    );

    const nickname =
        nicknameInput.value.trim();

    errorElement.textContent = "";

    if (!gameId) {

        errorElement.textContent =
            "В ссылке отсутствует код игры.";

        return;
    }

    if (!nickname) {

        errorElement.textContent =
            "Введите никнейм.";

        return;
    }

    // Сохраняем только корректный никнейм
    localStorage.setItem(
        "starTestQuest_nickname",
        nickname
    );

    savedNickname = nickname;

    joinButton.disabled = true;

    joinButton.textContent =
        "Подключение...";

    socket.emit(
        "player:join_game",
        {
            gameId,
            nickname,
            playerId
        }
    );
}



// ==================================================
// JOIN SUCCESS
// ==================================================

socket.on(
    "player:joined",
    ({
        nickname,
        restored = false,
        team = null,
        gameStarted = false,
        scene = null,
        timer = null,
        bugSearch = null
    }) => {

        console.log(
            "Игрок вошёл:",
            {
                nickname,
                restored,
                team,
                gameStarted,
                scene,
                timer,
                bugSearch
            }
        );

        // ==========================================
        // СОХРАНЯЕМ НИКНЕЙМ
        // ==========================================

        if (nickname) {

            savedNickname = nickname;

            localStorage.setItem(
                "starTestQuest_nickname",
                nickname
            );

            if (playerNickname) {
                playerNickname.textContent = nickname;
            }

        } else if (savedNickname && playerNickname) {

            playerNickname.textContent =
                savedNickname;

        }


        // ==========================================
        // ИГРОК УСПЕШНО ВОШЁЛ
        // ==========================================

        isRestoringGame = false;

        // Очень важно:
        // после успешного ответа сервера
        // экран ввода логина больше не показываем.

        if (joinScreen) {
            joinScreen.classList.add("hidden");
        }


        // ==========================================
        // ВОССТАНОВЛЕНИЕ
        // ==========================================

        if (restored) {

            console.log(
                "ИГРОК ВОССТАНОВЛЕН"
            );


            // ------------------------------------------
            // Восстанавливаем команду
            // ------------------------------------------

            if (team) {

                const teamNames = {

                    strategist: "Стратеги",
                    joker: "Шутники",
                    critic: "Критики"

                };

                selectedTeamText.textContent =
                    `Твоя команда: ${
                        teamNames[team] || team
                    }`;

            }


            // ------------------------------------------
            // Игра уже началась
            // ------------------------------------------

            if (gameStarted) {

                console.log(
                    "Игра уже идёт — ждём восстановленную сцену."
                );

                lobbyScreen.classList.add("hidden");
                teamScreen.classList.add("hidden");
                waitingScreen.classList.add("hidden");

                // game:started должен прийти от сервера
                // и уже показать gameScreen.

                return;
            }


            // ------------------------------------------
            // Игра ещё не началась
            // ------------------------------------------

            lobbyScreen.classList.add("hidden");
            teamScreen.classList.add("hidden");
            gameScreen.classList.add("hidden");

            waitingScreen.classList.remove("hidden");

            return;
        }


        // ==========================================
        // НОВЫЙ ИГРОК
        // ==========================================

        if (welcomeVoice) {

            welcomeVoice.pause();
            welcomeVoice.currentTime = 0;

        }


        lobbyScreen.classList.add("hidden");
        waitingScreen.classList.add("hidden");
        gameScreen.classList.add("hidden");

        teamScreen.classList.remove("hidden");


        if (
            voiceEnabled &&
            teamVoice
        ) {

            stopVoice();

            currentVoice =
                teamVoice;

            teamVoice.currentTime = 0;

            teamVoice.play()
                .catch(error => {

                    console.warn(
                        "Не удалось запустить озвучку выбора команды:",
                        error
                    );

                });

        }


        console.log(
            "Новый игрок находится на экране выбора команды."
        );

    }
);

// ==================================================
// PLAYER: RESTORE STATE
// ==================================================
socket.on(
    "player:restore_state",
    ({
        gameId,
        nickname,
        team,
        score,
        status,
        scene,
        sceneState,
        pauseState,
        choiceId,
        timer,
        voting
    }) => {

        console.log(
            "🟢 Восстановлено состояние игрока:",
            {
                gameId,
                nickname,
                team,
                score,
                status,
                sceneId: scene?.id,
                sceneState,
                choiceId,
                timer,
                voting
            }
        );

        /* -------------------------------------------------
         * 1️⃣ Сохраняем ник (в UI и localStorage)
         * ------------------------------------------------- */
        if (nickname) {
            savedNickname = nickname;
            localStorage.setItem("starTestQuest_nickname", nickname);
            if (playerNickname) playerNickname.textContent = nickname;
        }

        /* -------------------------------------------------
         * 2️⃣ Отключаем все стартовые экраны, оставляем только игровую
         * ------------------------------------------------- */
        joinScreen?.classList.add("hidden");
        lobbyScreen?.classList.add("hidden");
        teamScreen?.classList.add("hidden");
        waitingScreen?.classList.add("hidden");
        kickedScreen?.classList.add("hidden");
        gameScreen?.classList.remove("hidden");

        /* -------------------------------------------------
         * 3️⃣ Восстанавливаем команду (если уже выбрана)
         * ------------------------------------------------- */
        if (team) {
            const teamNames = {
                strategist: "Стратеги",
                joker: "Шутники",
                critic: "Критики"
            };
            if (selectedTeamText) {
                selectedTeamText.textContent =
                    `Твоя команда: ${teamNames[team] || team}`;
            }
        }
        // -------------------------------------------------
        // 4️⃣ Восстанавливаем таймер сцены
        // -------------------------------------------------

        if (
            status === "playing" &&
            timer &&
            timer.endsAt
        ) {

            startSceneTimer(
                timer.endsAt
            );

        } else if (
            status === "paused" &&
            timer
        ) {

            // Во время паузы сервер должен прислать
            // оставшееся время.
            //
            // Поддерживаем два варианта:
            // timer.remainingMs
            // timer.remainingSeconds

            if (
                typeof timer.remainingMs === "number"
            ) {

                sceneTimerRemainingMs =
                    Math.max(
                        0,
                        timer.remainingMs
                    );

                renderSceneTimerRemaining(
                    sceneTimerRemainingMs
                );

            } else if (
                typeof timer.remainingSeconds === "number"
            ) {

                sceneTimerRemainingMs =
                    Math.max(
                        0,
                        timer.remainingSeconds * 1000
                    );

                renderSceneTimerRemaining(
                    sceneTimerRemainingMs
                );

            } else if (
                timer.endsAt
            ) {

                // Запасной вариант:
                // если сервер всё ещё прислал endsAt.
                startSceneTimer(
                    timer.endsAt
                );

                pauseSceneTimer();

            } else {

                console.warn(
                    "⚠️ Игра на паузе, но сервер не прислал оставшееся время таймера:",
                    timer
                );

                stopSceneTimer();

            }

        } else {

            stopSceneTimer();

        }

        /* -------------------------------------------------
         * 5️⃣ Если сцена не пришла (обычно речь о лобби) – выходим
         * ------------------------------------------------- */
        if (!scene) {
            console.warn("⚪️ Сцена не пришла – игрок, вероятно, в лобби.");
            return;
        }
        // -------------------------------------------------
        // Игра была на паузе во время переподключения
        // ------------------------------------- ------------

        if (status === "paused") {

            console.log(
                "⏸️ Игрок восстановлен во время паузы"
            );

            showGamePause();

        }

        /* -------------------------------------------------
         * 6️⃣ Сохраняем сцену в глобальную переменную
         * ------------------------------------------------- */
        currentScene = scene;

       /* -------------------------------------------------
         * 7️⃣  Специальный рендер для каждой категории сцен
         * ------------------------------------------------- */

        // -------------------------------------------------
        // 7.1 Обычная (не bug_search) сцена
        // -------------------------------------------------
        if (scene.type !== "bug_search") {

            // ---------- ФОН ----------
            if (gameBackground && scene.background) {
                gameBackground.style.backgroundImage = `url("${scene.background}")`;
            }

            // ---------- ПЕРСОНАЖИ ----------
            if (charactersLayer) {
                charactersLayer.innerHTML = "";
                const chars = scene.characters ||
                    (scene.character ? [scene.character] : []);
                chars.forEach(ch => {
                    const frame = document.createElement("div");
                    frame.className = "character-frame";

                    const img = document.createElement("img");
                    img.className = "character-avatar";
                    img.src = ch.image;
                    img.alt = ch.name || "";

                    const name = document.createElement("div");
                    name.className = "character-frame-name";
                    name.textContent = ch.name || "";

                    frame.appendChild(img);
                    frame.appendChild(name);
                    charactersLayer.appendChild(frame);
                });
            }

            // ---------- ТЕКСТ ----------
            if (dialogueText) {
                dialogueText.textContent = scene.text || "";
            }

            // ---------- ОЗВУЧКА ----------
            if (scene.voice) {
                playVoice(scene.voice);
            }

            // ---------- КНОПКИ ВЫБОРА ----------
            if (choiceButtons) {
                choiceButtons.innerHTML = "";
                (scene.choices || []).forEach(choice => {
                    const btn = document.createElement("button");
                    btn.className = "game-choice-button";
                    btn.textContent = choice.text;
                    btn.dataset.choiceId = choice.id;

                    // Если уже был сделан выбор – отмечаем и блокируем
                    if (choiceId && choiceId === choice.id) {
                        btn.classList.add("selected");
                        btn.disabled = true;
                    }

                    btn.addEventListener("click", () => {
                        console.log("🟢 Выбран вариант:", choice.id);
                        markSelectedButton(btn, ".choice-buttons");
                        // блокируем все кнопки, чтобы избежать двойных кликов
                        choiceButtons.querySelectorAll("button")
                            .forEach(b => b.disabled = true);
                        socket.emit("player:choice", { choiceId: choice.id });
                    });

                    choiceButtons.appendChild(btn);
                });
            }

            // ---------- ВОССТАНОВЛЕНИЕ ГОЛОСОВАНИЯ ----------
            if (voting && voting.active) {
                console.log("🔔 Восстанавливаем активное голосование", voting);
                if (choiceId) {
                    choiceButtons.querySelectorAll("button")
                        .forEach(b => {
                            if (b.dataset.choiceId !== choiceId) b.disabled = true;
                        });
                }
            }

            // ---------- ДЕЛАЕМ ПАНЕЛЬ ДИАЛОГА ВИДИМОЙ ----------
            if (dialoguePanel) {
                dialoguePanel.classList.remove("hidden");
            }
        }

        // -------------------------------------------------
        // 7.2  BUG‑SEARCH СЦЕНА
        // -------------------------------------------------
        else {

            // Фон (тот же, что и у обычных сцен)
            if (gameBackground && scene.background) {
                gameBackground.style.backgroundImage = `url("${scene.background}")`;
            }

            // Очищаем персонажей, потому что в bug‑search их не показываем
            if (charactersLayer) {
                charactersLayer.innerHTML = "";
            }

            // Скрываем обычный диалог, потому что он не используется в bug‑search
            if (dialoguePanel) {
                dialoguePanel.classList.add("hidden");
            }

            // ----------------- ВОССТАНАВЛИВАЕМ СОСТОЯНИЕ -----------------
            // sceneState пришёл от сервера (mistakes, foundBugs, answeredCards, status)
            const restoredState = {
                mistakes: sceneState?.mistakes ?? 0,
                found:    sceneState?.foundBugs?.length ?? 0,
                finished: sceneState?.status === "won" || sceneState?.status === "lost",

                // массив карточек берём из самой сцены – он всегда одинаковый
                cards: scene.cards || [],

                // Текущий индекс = количество уже отвеченных карточек
                currentIndex: (sceneState?.answeredCards?.length) ?? 0,

                // Сохраняем всю сцену, чтобы renderBugSearchScene могла её использовать
                scene
            };

            // Используем уже готовую функцию рендера bug‑search,
            // передаём в неё сцену и восстановленное состояние
            renderBugSearchScene(scene, restoredState);
        }
    }
);


function restoreGameControlsAfterResume() {

    if (isGamePaused) {
        return;
    }

    // ------------------------------------------
    // BUG SEARCH
    // ------------------------------------------

    if (
        currentScene &&
        currentScene.type === "bug_search"
    ) {

        if (
            bugSearchState &&
            !bugSearchState.finished
        ) {

            const bugButton =
                document.getElementById(
                    "bugButton"
                );

            const normalButton =
                document.getElementById(
                    "normalButton"
                );

            if (bugButton) {
                bugButton.disabled = false;
            }

            if (normalButton) {
                normalButton.disabled = false;
            }

        }

    }
}

// ==================================================
// JOIN ERROR
// ==================================================

socket.on(
    "player:join_error",
    ({ message }) => {

        console.error(
            "Ошибка входа:",
            message
        );


        errorElement.textContent =
            message;


        joinButton.disabled =
            false;


        joinButton.textContent =
            "Присоединиться";

    }
);


// ==================================================
// LOBBY UPDATE
// ==================================================

socket.on(
    "lobby:update",
    ({ players }) => {

        console.log(
            "Обновление lobby:",
            players
        );


        lobbyPlayerCount.textContent =
            players.length;


        // Если игроки находятся в lobby
        // и ещё не выбрали команду,
        // показываем выбор команды.

        const currentPlayer =
            players.find(
                player =>
                    player.id === playerId
            );


        if (
            currentPlayer &&
            !currentPlayer.team &&
            !teamScreen.classList.contains("hidden")
        ) {

            return;

        }

    }
);


// ==================================================
// BUG SEARCH RESULT
// ==================================================
socket.on(
    "bugsearch:result",
    ({
        cardId,
        answer,
        correct,
        found,
        mistakes,
        finished,
        result,
        points
    }) => {

        console.log(
            "Результат bug search:",
            {
                cardId,
                correct,
                found,
                mistakes,
                finished,
                result,
                points
            }
        );


        bugSearchState.found =
            found;


        bugSearchState.mistakes =
            mistakes;


        const status =
            document.getElementById(
                "bugSearchStatus"
            );


        // ------------------------------------------
        // ПРАВИЛЬНО
        // ------------------------------------------

        if (correct) {

            if (status) {
        
                if (answer === "bug") {
        
                    status.textContent =
                        "✅ Верно! Баг найден.";
        
                } else {
        
                    status.textContent =
                        "✅ Верно! Здесь всё нормально.";
        
                }
        
            }
        
        }


        // ------------------------------------------
        // НЕПРАВИЛЬНО
        // ------------------------------------------

        else {

            if (status) {

                status.textContent =
                    answer === "bug"
                        ? "❌ Здесь бага нет."
                        : "❌ Здесь был баг!";
                }

        }


        // ------------------------------------------
        // ИГРА ЗАКОНЧЕНА ПОБЕДОЙ
        // ------------------------------------------

        if (
            finished &&
            result === "win"
        ) {

            bugSearchState.finished =
                true;


            if (status) {

                status.textContent =
                    `🎉 Все баги найдены! +${points} очков.`;

            }


            setTimeout(
                () => {

                    finishBugSearch();

                },
                1500
            );


            return;
        }


        // ------------------------------------------
        // ПРОИГРЫШ
        // ------------------------------------------

        if (
            finished &&
            result === "lose"
        ) {

            bugSearchState.finished =
                true;


            if (status) {

                status.textContent =
                    "💥 Слишком много ошибок. Ты проиграл в этой мини-игре.";

            }


            setTimeout(
                () => {

                    finishBugSearch();

                },
                1500
            );


            return;
        }


        // ------------------------------------------
        // ПЕРЕХОД К СЛЕДУЮЩЕЙ КАРТИНКЕ
        // ------------------------------------------

        setTimeout(
            () => {

                bugSearchState.currentIndex++;

                showBugSearchCard();

            },
            1200
        );

    }
);

// ==================================================
// BUG SEARCH WIN
// ==================================================
function showBugSearchWin(points) {

    const status =
        document.getElementById(
            "bugSearchStatus"
        );

    if (status) {

        status.textContent =
            `🎉 Все баги найдены! +${points} очков. ` +
            `Ждём окончания таймера...`;

    }

    document
        .querySelectorAll(".bug-card")
        .forEach(button => {

            button.disabled = true;

        });
}

// ==================================================
// BUG SEARCH LOSE
// ==================================================
function showBugSearchLose() {

    const status =
        document.getElementById(
            "bugSearchStatus"
        );

    if (status) {

        status.textContent =
            "💥 Слишком много ошибок. " +
            "Ты проиграл эту сцену.";

    }

    document
        .querySelectorAll(".bug-card")
        .forEach(button => {

            button.disabled = true;

        });
}

function finishBugSearch() {

    console.log(
        "Bug search завершён"
    );


    bugSearchState.finished =
        true;


    const bugSearch =
        document.getElementById(
            "bugSearch"
        );


    const status =
        document.getElementById(
            "bugSearchStatus"
        );


    const bugButton =
        document.getElementById(
            "bugButton"
        );


    const normalButton =
        document.getElementById(
            "normalButton"
        );


    bugButton.disabled =
        true;


    normalButton.disabled =
        true;


    if (status) {

        status.textContent =
            "Мини-игра завершена.";

    }


    /*
     * Здесь НЕ нужно вручную переходить
     * на следующую сцену.
     *
     * Сервер сам перейдёт туда после
     * истечения duration.
     */
}

// ==================================================
// TEAM BUTTONS
// ==================================================
teamButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                const team =
                    button.dataset.team;

                console.log(
                    "Выбрана команда:",
                    team
                );

                // Визуально показываем выбранную команду
                markSelectedButton(
                    button,
                    ".team-buttons"
                );

                // Блокируем кнопки,
                // пока сервер не подтвердит выбор
                teamButtons.forEach(
                    btn => {
                        btn.disabled = true;
                    }
                );

                teamStatus.textContent =
                    "Сохраняем выбор...";

                socket.emit(
                    "player:choose_team",
                    {
                        team
                    }
                );

            }
        );

    }
);


// ==================================================
// TEAM SELECTED
// ==================================================

socket.on(
    "player:team_selected",
    ({ team }) => {

        console.log(
            "Сервер подтвердил команду:",
            team
        );


        const teamNames = {

            strategist:
                "Стратеги",

            joker:
                "Шутники",

            critic:
                "Критики"

        };


        const teamName =
            teamNames[team];


        selectedTeamText.textContent =
            `Твоя команда: ${teamName}`;


        teamScreen.classList.add(
            "hidden"
        );


        waitingScreen.classList.remove(
            "hidden"
        );

    }
);


// ==================================================
// GAME STARTED
// ==================================================

socket.on(
    "game:started",
    ({ scene, timer }) => {

        console.log(
            "Получена новая сцена:",
            scene
        );

        if (dialoguePanel) {
            dialoguePanel.classList.remove("hidden");
        }
        
        if (bugSearch) {
            bugSearch.classList.add("hidden");
        }

        currentScene = scene;

        // Запускаем общий таймер сцены
        if (timer && timer.endsAt) {

            startSceneTimer(
                timer.endsAt
            );

        } else {

            stopSceneTimer();

        }

        // Останавливаем стартовую озвучку
        if (welcomeVoice) {
            welcomeVoice.pause();
            welcomeVoice.currentTime = 0;
        }

        // Скрываем старые экраны
        joinScreen.classList.add("hidden");
        lobbyScreen.classList.add("hidden");
        teamScreen.classList.add("hidden");
        waitingScreen.classList.add("hidden");

        // Показываем игровой экран
        gameScreen.classList.remove("hidden");

        // ==========================================
        // BUG SEARCH
        // ==========================================

        if (scene.type === "bug_search") {

            // ------------------------------------------
            // ФОН BUG SEARCH
            // ------------------------------------------
        
            if (
                gameBackground &&
                scene.background
            ) {
        
                gameBackground.style.backgroundImage =
                    `url("${scene.background}")`;
        
            }
        
            // ------------------------------------------
            // УБИРАЕМ ПЕРСОНАЖЕЙ ПРЕДЫДУЩЕЙ СЦЕНЫ
            // ------------------------------------------
        
            if (charactersLayer) {
        
                charactersLayer.innerHTML = "";
        
            }
        
            // ------------------------------------------
            // СКРЫВАЕМ TRANSITION
            // ------------------------------------------
        
            hideSceneTransition();
        
            // ------------------------------------------
            // ЗАПУСКАЕМ BUG SEARCH
            // ------------------------------------------
            renderBugSearchScene(
                scene,
                bugSearch
            );
        
            return;
        }

        // ==========================================
        // ОБЫЧНАЯ СЦЕНА
        // ==========================================

        transitionToScene(
            () => {

                // ----------------------------------
                // ФОН
                // ----------------------------------

                if (
                    gameBackground &&
                    scene.background
                ) {

                    gameBackground.style.backgroundImage =
                        `url("${scene.background}")`;

                }

                // ----------------------------------
                // ПЕРСОНАЖИ
                // ----------------------------------

                if (charactersLayer) {

                    charactersLayer.innerHTML = "";

                    const characters =
                        scene.characters ||
                        (
                            scene.character
                                ? [scene.character]
                                : []
                        );

                    characters.forEach(
                        character => {

                            const characterFrame =
                                document.createElement("div");

                            characterFrame.className =
                                "character-frame";

                            const image =
                                document.createElement("img");

                            image.className =
                                "character-avatar";

                            image.src =
                                character.image;

                            image.alt =
                                character.name || "";

                            const name =
                                document.createElement("div");

                            name.className =
                                "character-frame-name";

                            name.textContent =
                                character.name || "";

                            characterFrame.appendChild(
                                image
                            );

                            characterFrame.appendChild(
                                name
                            );

                            charactersLayer.appendChild(
                                characterFrame
                            );

                        }
                    );

                }

                // ----------------------------------
                // ТЕКСТ
                // ----------------------------------

                if (dialogueText) {

                    dialogueText.textContent =
                        scene.text || "";

                }

                // ----------------------------------
                // ОЗВУЧКА
                // ----------------------------------

                playVoice(
                    scene.voice
                );

                // ==========================================
                // ФИНАЛЬНАЯ СЦЕНА — ПОСЛЕДОВАТЕЛЬНЫЕ ПЕРСОНАЖИ
                // ==========================================

                if (
                    scene.finalCharacters &&
                    charactersLayer
                ) {

                    let index = 0;

                    function showFinalCharacter() {

                        if (
                            index >= scene.finalCharacters.length
                        ) {
                            return;
                        }

                        const character =
                            scene.finalCharacters[index];

                        charactersLayer.innerHTML = "";

                        const characterFrame =
                            document.createElement("div");

                        characterFrame.className =
                            "character-frame";

                        const image =
                            document.createElement("img");

                        image.className =
                            "character-avatar";

                        image.src =
                            character.image;

                        image.alt =
                            character.name || "";

                        const name =
                            document.createElement("div");

                        name.className =
                            "character-frame-name";

                        name.textContent =
                            character.name || "";

                        characterFrame.appendChild(
                            image
                        );

                        characterFrame.appendChild(
                            name
                        );

                        charactersLayer.appendChild(
                            characterFrame
                        );

                        if (dialogueText) {
                            dialogueText.textContent =
                                character.text || "";
                        }

                        playVoice(
                            character.voice
                        );

                        index++;

                        if (character.duration) {

                            setTimeout(
                                showFinalCharacter,
                                character.duration
                            );

                        }

                    }

                    showFinalCharacter();
                }

                // ----------------------------------
                // ВАРИАНТЫ
                // ----------------------------------

                if (choiceButtons) {

                    choiceButtons.innerHTML = "";

                    (scene.choices || []).forEach(
                        choice => {

                            const button =
                                document.createElement(
                                    "button"
                                );

                            button.className =
                                "game-choice-button";

                            button.textContent =
                                choice.text;

                            button.dataset.choiceId =
                                choice.id;

                                button.addEventListener(
                                    "click",
                                    () => {
                                
                                        console.log(
                                            "Выбран вариант:",
                                            choice.id
                                        );
                                
                                        // Показываем, какой вариант выбран
                                        markSelectedButton(
                                            button,
                                            ".choice-buttons"
                                        );
                                
                                        // Блокируем повторное нажатие
                                        const buttons =
                                            choiceButtons.querySelectorAll("button");
                                
                                        buttons.forEach(btn => {
                                            btn.disabled = true;
                                        });
                                
                                        socket.emit(
                                            "player:choice",
                                            {
                                                choiceId:
                                                    choice.id
                                            }
                                        );
                                
                                    }
                                );

                            choiceButtons.appendChild(
                                button
                            );

                        }
                    );

                }

            }
        );

    }
);

// ==================================================
// GAME PAUSED
// ==================================================

socket.on(
    "game:paused",
    ({ gameId }) => {

        console.log(
            "⏸️ Игра поставлена на паузу:",
            gameId
        );

        showGamePause();

    }
);

// ==================================================
// GAME RESUMED
// ==================================================

socket.on(
    "game:resumed",
    ({
        gameId,
        timer,
        voting
    }) => {

        console.log(
            "▶️ Игра продолжена:",
            {
                gameId,
                timer,
                voting
            }
        );

        hideGamePause();

        restoreGameControlsAfterResume();

        if (
            timer &&
            timer.endsAt
        ) {

            startSceneTimer(
                timer.endsAt
            );

        } else if (
            timer &&
            typeof timer.remainingSeconds === "number"
        ) {

            startSceneTimer(
                Date.now() +
                timer.remainingSeconds * 1000
            );

        } else if (
            timer &&
            typeof timer.remainingMs === "number"
        ) {

            startSceneTimer(
                Date.now() +
                timer.remainingMs
            );

        } else {

            stopSceneTimer();

        }

    }
);

// ==================================================
// CHOICE RESULT
// ==================================================

socket.on(
    "player:choice_result",
    ({ choiceId, points }) => {

        console.log(
            "Выбор принят сервером:",
            choiceId,
            `+${points}`
        );

    }
);

// ==================================================
// VOTING FINISHED
// ==================================================

socket.on(
    "voting:finished",
    ({
        voteCounts,
        winner,
        tie
    }) => {

        console.log(
            "Голосование завершено:",
            {
                voteCounts,
                winner,
                tie
            }
        );


        if (!winner) {
            return;
        }


        // ------------------------------------------
        // ИЩЕМ ТЕКСТ ПОБЕДИВШЕГО ВАРИАНТА
        // ------------------------------------------

        const winningChoice =
            currentScene &&
            currentScene.choices
                ? currentScene.choices.find(
                    choice =>
                        choice.id === winner
                )
                : null;


        const winnerText =
            winningChoice
                ? winningChoice.text
                : winner;


        // ------------------------------------------
        // ПОКАЗЫВАЕМ ПЕРЕХОД
        // ------------------------------------------

        showSceneTransition({

            title:
                "ВЫБОР СДЕЛАН",

            text:
                `Победил вариант:\n«${winnerText}»`,

            nextText:
                "Готовимся к следующей сцене..."

        });

    }
);

// ==================================================
// REVOTE STARTED
// ==================================================
socket.on(
    "voting:revote_started",
    ({ tiedChoices, duration, round }) => {

        console.log(
            `Начался ревот (раунд ${round}) – доступны варианты:`,
            tiedChoices
        );

        console.log(
            `Время до окончания ревота: ${duration} сек`
        );

        if (!choiceButtons) {
            return;
        }

        const buttons =
            choiceButtons.querySelectorAll("button");

        buttons.forEach(btn => {

            // Сбрасываем старый выбор
            btn.classList.remove("selected");

            // Снова разрешаем выбирать
            btn.disabled = false;

        });

        const status =
            document.getElementById("teamStatus");

        if (status) {

            status.textContent =
                `Ревот! Выберите один из вариантов: ${
                    tiedChoices.join(", ")
                }`;

        }

    }
);


// ==================================================
// SOCKET DISCONNECT
// ==================================================

socket.on(
    "disconnect",
    () => {

        console.log(
            "Socket отключён"
        );

    }
);

// ==================================================
// PLAYER KICKED
// ==================================================

// ==================================================
// PLAYER KICKED
// ==================================================

socket.on(
    "player:kicked",
    ({ message }) => {

        console.log(
            "Игрок был удалён:",
            message
        );


        // Скрываем все основные экраны

        joinScreen.classList.add(
            "hidden"
        );

        lobbyScreen.classList.add(
            "hidden"
        );

        teamScreen.classList.add(
            "hidden"
        );

        waitingScreen.classList.add(
            "hidden"
        );


        // Показываем экран исключения

        kickedMessage.textContent =
            message ||
            "Вы были удалены из игры администратором.";


        kickedScreen.classList.remove(
            "hidden"
        );


        // Только после отображения экрана
        // отключаем соединение

        setTimeout(
            () => {

                socket.disconnect();

            },
            100
        );

    }
);

returnToStartButton.addEventListener(
    "click",
    () => {

        window.location.href = "/";

    }
);

socket.on(
    "game:finished",
    ({ results }) => {

        console.log(
            "Игра завершена. Результаты:",
            results
        );

        // Скрываем игровые экраны
        joinScreen.classList.add("hidden");
        lobbyScreen.classList.add("hidden");
        teamScreen.classList.add("hidden");
        waitingScreen.classList.add("hidden");
        gameScreen.classList.add("hidden");

        // Показываем результаты
        resultsScreen.classList.remove("hidden");

        // Очищаем старый список
        resultsList.innerHTML = "";

        // results уже отсортирован сервером
        results.forEach(
            (player, index) => {

                const row =
                    document.createElement("div");

                row.className =
                    "result-row";

                row.innerHTML = `
                    <span class="result-place">
                        ${index + 1}
                    </span>

                    <span class="result-name">
                        ${player.nickname}
                    </span>

                    <span class="result-score">
                        ${player.score}
                    </span>
                `;

                resultsList.appendChild(row);
            }
        );
    }
);