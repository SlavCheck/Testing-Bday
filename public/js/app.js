const socket = io();

// ==================================================
// VOICE
// ==================================================
let voiceEnabled = false;
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


const HOUSE_NAMES = {
    gryffindor: "🦁 Гриффиндев",
    slytherin: "🐍 Фичерин",
    ravenclaw: "🦅 Кодтевран",
    hufflepuff: "🦡 Пуффентест"
};
const CLASSIC_TEAM_NAMES = {
    strategist: "📋 Стратеги",
    joker: "🎭 Шутники",
    critic: "🔎 Критики"
};
function showAssignedGroup(house, team, gameType) {
    const isClassic = gameType === "classic" || (!house && team in CLASSIC_TEAM_NAMES);
    const heading = document.getElementById("assignmentHeading");
    if (heading) heading.textContent = isClassic ? "Твоя команда определена!" : "Твой факультет определён!";
    if (selectedTeamText) selectedTeamText.textContent = isClassic
        ? `Твоя команда: ${CLASSIC_TEAM_NAMES[team] || team || "Не определена"}`
        : `Твой факультет: ${HOUSE_NAMES[house] || house || "Не определён"}`;
}

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
// BUG SEARCH IMAGE LIGHTBOX
// ==================================================

let bugSearchLightbox = null;
let bugSearchLightboxImage = null;

function createBugSearchLightbox() {

    // Если уже создан — повторно не создаём
    if (bugSearchLightbox) {
        return;
    }

    bugSearchLightbox =
        document.createElement("div");

    bugSearchLightbox.id =
        "bugSearchImageLightbox";

    bugSearchLightbox.innerHTML = `
        <button
            id="bugSearchImageLightboxClose"
            type="button"
            aria-label="Закрыть"
        >
            ×
        </button>

        <img
            id="bugSearchImageLightboxImage"
            src=""
            alt=""
        >
    `;

    document.body.appendChild(
        bugSearchLightbox
    );

    bugSearchLightboxImage =
        document.getElementById(
            "bugSearchImageLightboxImage"
        );

    const closeButton =
        document.getElementById(
            "bugSearchImageLightboxClose"
        );

    // ------------------------------------------
    // ЗАКРЫТИЕ КНОПКОЙ
    // ------------------------------------------

    closeButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            closeBugSearchLightbox();

        }
    );

    bugSearchLightboxImage.addEventListener(
        "click",
        (event) => {
            event.stopPropagation();
            closeBugSearchLightbox();
        }
    );
    
    // ------------------------------------------
    // ЗАКРЫТИЕ КЛИКОМ ПО ФОНУ
    // ------------------------------------------

    bugSearchLightbox.addEventListener(
        "click",
        (event) => {

            if (
                event.target === bugSearchLightbox
            ) {

                closeBugSearchLightbox();

            }

        }
    );

}


// Открыть изображение

function openBugSearchLightbox(src, alt = "") {

    createBugSearchLightbox();

    if (!bugSearchLightboxImage) {
        return;
    }

    bugSearchLightboxImage.src =
        src;

    bugSearchLightboxImage.alt =
        alt;

    bugSearchLightbox.classList.add(
        "active"
    );

    // Блокируем прокрутку страницы
    document.body.style.overflow =
        "hidden";
}


// Закрыть изображение

function closeBugSearchLightbox() {

    if (!bugSearchLightbox) {
        return;
    }

    bugSearchLightbox.classList.remove(
        "active"
    );

    document.body.style.overflow =
        "";

}


// ------------------------------------------
// ESC
// ------------------------------------------

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            bugSearchLightbox &&
            bugSearchLightbox.classList.contains("active")
        ) {

            closeBugSearchLightbox();

        }

    }
);

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

    // Клик по картинке — открыть увеличенную версию
    image.onclick = () => {
        openBugSearchLightbox(
            image.src,
            "Изображение для поиска бага"
        );
    };

    setTimeout(() => {

        image.onload = () => {
            image.style.opacity = "1";
        };

        image.src = card.image;

    }, 150);

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
let serverTimeOffset = 0;

function startSceneTimer(endsAt, serverNow = null) {

    if (!sceneTimer) {
        return;
    }

    if (sceneTimerInterval) {
        clearInterval(sceneTimerInterval);
        sceneTimerInterval = null;
    }

    // Синхронизация часов клиента с сервером
    if (typeof serverNow === "number") {
        serverTimeOffset = serverNow - Date.now();
    }

    sceneTimerEndsAt = endsAt;
    sceneTimerRemainingMs = null;

    function updateSceneTimer() {

        const now = Date.now() + serverTimeOffset;

        const remaining =
            Math.max(
                0,
                sceneTimerEndsAt - now
            );

        renderSceneTimerRemaining(remaining);

        if (remaining <= 0) {

            clearInterval(sceneTimerInterval);
            sceneTimerInterval = null;

            sceneTimer.textContent = "⏱ 0:00";
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
        house = null,
        gameType = "harry-potter",
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
                house,
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


            showAssignedGroup(house, team, gameType);

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
        teamScreen.classList.add("hidden");
        gameScreen.classList.add("hidden");
        showAssignedGroup(house, team, gameType);
        waitingScreen.classList.remove("hidden");

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
        house,
        gameType = "harry-potter",
        snitchAnswer,
        potionAnswer,
        negativePotionAnswer,
        treeRole,
        treeChat,
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

        showAssignedGroup(house, team, gameType);
        if (status === "lobby") {
            gameScreen?.classList.add("hidden");
            waitingScreen?.classList.remove("hidden");
            return;
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
                timer.endsAt,
                timer.serverNow
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
        if (scene.novelVoting) {
            renderNovelVoting(scene, snitchAnswer);
            return;
        }
        if (scene.type === "visual_novel") {
            renderVisualNovel(scene);
            return;
        }
        if (scene.type === "tree_spell") {
            treeCurrentRole = treeRole;
            renderTreeSpell(treeRole);
            document.getElementById("treeChatMessages").replaceChildren();
            for(const entry of treeChat || []) appendTreeChat(entry);
            return;
        }
        if (scene.type === "potion_negative_test") {
            negativePotionOrder = [];
            renderNegativePotionTest(scene, timer, negativePotionAnswer);
            return;
        }
        if (scene.type === "potion_recipe") {
            renderPotionRecipe(scene, timer, potionAnswer);
            return;
        }
        if (scene.type === "cloak_search") {
            renderCloakSearch(scene);
            return;
        }
        if (scene.type === "garland_fire") {
            renderGarlandFire(scene);
            return;
        }
        if (scene.type === "snitch_flight") {
            renderSnitchFlight(scene, timer);
            return;
        }
        if (scene.type === "snitch_mystery" || scene.type === "snitch_announcement") {
            snitchDialogueIndex = 0;
            renderSnitchMystery(scene, snitchAnswer);
            return;
        }

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
    // ОБЫЧНАЯ СЦЕНА
    // ------------------------------------------

    if (
        currentScene &&
        currentScene.type !== "bug_search"
    ) {

        if (choiceButtons) {

            const buttons =
                choiceButtons.querySelectorAll("button");

            buttons.forEach(button => {

                // Если игрок уже сделал выбор,
                // оставляем все кнопки заблокированными.
                if (
                    choiceButtons.querySelector(
                        "button.selected"
                    )
                ) {

                    button.disabled = true;

                } else {

                    // Если выбора ещё не было —
                    // после паузы снова разрешаем выбор.
                    button.disabled = false;

                }

            });

        }

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

// All players share the server's 90-second clock. Only testimony navigation is local.
let savedSnitchAnswer = null;
let flightAnimationFrame = null;
let flightTimerEndsAt = 0;
let flightClockOffset = 0;
const snitchClickPositions = [];
function stopSnitchFlight() {
    if (flightAnimationFrame !== null) cancelAnimationFrame(flightAnimationFrame);
    flightAnimationFrame = null;
    snitchClickPositions.length = 0;
    document.querySelectorAll(".snitch-score-popup").forEach(node => node.remove());
    document.getElementById("snitchFlight")?.classList.add("hidden");
}
let vnBeatIndex = 0;
let vnSceneId = null;
const VN_ASSETS = {
    characters: {
        "Альберт Деплоймор": "Albert_Deploymore_tech_new_year.png",
        "Минерва Баггонагалл": "Minerva_Baggonagall_tech_new_year.png",
        "Северин Снейпшот": "Severin_Snapeshot_tech_new_year.png",
        "Гаррет Поттерн": "Garrett_Pattern_tech_new_year.png",
        "Рональд Рандомли": "Ronald_Randomly_tech_new_year.png",
        "Гермина Грейдтест": "Hermina_Gradetest_tech_new_year.png",
        "Драко Малфич": "Draco_Malfeature_tech_new_year.png",
        "Шляпа Сортировочная 2.0": "Sorting_Hat_tech_new_year.png"
    },
    backgrounds: {
        1: "characters/hall_tech_new_year.png",
        2: "characters/hall_tech_new_year.png",
        3: "characters/hall_error_tech_new_year.png",
        4: "backgrounds/Room_of_snitch_tech_new_year.png",
        5: "backgrounds/Room_of_snitch_tech_new_year.png",
        6: "backgrounds/Room_of_snitch_tech_new_year.png",
        7: "characters/Snitch_catching_hall_tech_new_year.png",
        8: "characters/hall_error_tech_new_year.png",
        9: "characters/hall_error_tech_new_year.png",
        10: "characters/hall_error_tech_new_year.png",
        11: "backgrounds/requirements_room_tech_new_year.png",
        12: "backgrounds/potion_laboratory_tech_new_year.png",
        13: "backgrounds/potion_laboratory_tech_new_year.png",
        14: "backgrounds/potion_laboratory_tech_new_year.png",
        15: "backgrounds/potion_laboratory_tech_new_year.png",
        16: "characters/hall_error_tech_new_year.png",
        17: "characters/hall_error_tech_new_year.png",
        18: "backgrounds/hall_tech_fixed_new_year.png"
    }
};
const VN_CHAR_BASE = "/assets/characters/NewYearsCH/";
const VN_BG_BASE = "/assets/";
function renderVisualNovel(scene, preserve = false) {
    const screen = scene.screen;
    if (!preserve || vnSceneId !== scene.id) vnBeatIndex = scene.novelVoting ? Math.max(0,screen.beats.length-1) : 0;
    vnSceneId = scene.id;
    stopSnitchFlight();
    for (const id of ["snitchMystery","garlandFire","cloakSearch","potionRecipe","potionNegativeTest","treeSpell"])
        document.getElementById(id)?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    document.getElementById("visualNovel").classList.remove("hidden");
    document.getElementById("vnAct").textContent = "ЭКРАН " + screen.number + " / 18";
    document.getElementById("vnSceneTitle").textContent = screen.title;
    const background = document.getElementById("vnBackground");
    const backgroundLabel = document.getElementById("vnBackgroundLabel");
    const backgroundFile = VN_ASSETS.backgrounds[screen.number];
    background.style.backgroundImage = backgroundFile ? 'linear-gradient(#07112233, #07112277), url("' + VN_BG_BASE + (backgroundFile.startsWith("characters/") ? "characters/NewYearsCH/" + backgroundFile.slice(11) : "backgrounds/NewYearBG/" + backgroundFile.slice(12)) + '")' : "";
    backgroundLabel.textContent = backgroundFile ? "" : "ФОН: " + (screen.background || "Багвартс");
    const characters = document.getElementById("vnCharacters");
    characters.replaceChildren();
    const beat = screen.beats[vnBeatIndex];
    const active = beat?.speaker || "";
    const speakers = new Set([...(screen.characters || []), ...screen.beats.filter(b => b.speaker !== "Система" && b.speaker !== "Событие" && b.speaker !== "Рассказчик").map(b=>b.speaker)]);
    for (const name of speakers) {
        const character = document.createElement("div");
        character.className = "vn-character" + (name === active ? " active" : "");
        const filename = VN_ASSETS.characters[name];
        if (filename) {
            const img = document.createElement("img");
            img.src = VN_CHAR_BASE + filename;
            img.alt = name;
            img.loading = "eager";
            img.onerror = () => { img.remove(); character.classList.add("vn-character-fallback"); };
            character.appendChild(img);
        } else {
            character.classList.add("vn-character-fallback");
        }
        const label = document.createElement("span");
        label.textContent = name;
        character.appendChild(label);
        characters.appendChild(character);
    }
    const prop = document.getElementById("vnProp");
    const props = {2:"Шляпа Сортировочная 2.0",4:"Пустая витрина / Золотой снитч",5:"Золотой снитч",7:"Летающий снитч",8:"Погасшая ёлка",9:"Новогодняя гирлянда",10:"Обгоревшая гирлянда",11:"Мантия-невидимка",12:"Котёл",13:"Котёл с зельем",14:"Флакон зелья",15:"Книга требований",16:"Журнал обновлений",17:"Тёмная ёлка / четыре герба",18:"Горящая ёлка / Кубок"};
    prop.textContent = props[screen.number] ? "ПРЕДМЕТ (заглушка): " + props[screen.number] : "";
    document.getElementById("vnSpeaker").textContent = beat?.speaker || "Рассказчик";
    document.getElementById("vnText").textContent = beat?.text || "История продолжается...";
    document.getElementById("vnProgress").textContent = (vnBeatIndex + 1) + " / " + screen.beats.length;
    document.getElementById("vnNext").textContent = vnBeatIndex < screen.beats.length - 1 ? "Далее ▸" : "Ожидаем следующую сцену…";
    document.getElementById("vnNext").disabled = vnBeatIndex >= screen.beats.length - 1;
    document.getElementById("vnPrev").disabled = vnBeatIndex === 0;
    document.getElementById("vnVote").classList.toggle("hidden", !scene.novelVoting);
}
document.getElementById("vnPrev")?.addEventListener("click", () => {
    if (currentScene?.type !== "visual_novel" && !currentScene?.novelVoting) return;
    if (vnBeatIndex > 0) { vnBeatIndex--; renderVisualNovel(currentScene,true); }
});
document.getElementById("vnNext")?.addEventListener("click", () => {
    if (currentScene?.type !== "visual_novel" && !currentScene?.novelVoting) return;
    if (vnBeatIndex < currentScene.screen.beats.length - 1) {
        vnBeatIndex++;
        renderVisualNovel(currentScene, true);
    }
});
function renderNovelVoting(scene, answer = null) {
    savedSnitchAnswer = answer;
    renderVisualNovel(scene);
    const options = document.getElementById("vnVoteOptions");
    options.replaceChildren();
    for (const suspect of scene.suspects) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = suspect.name;
        button.dataset.suspect = suspect.id;
        button.classList.toggle("selected",savedSnitchAnswer === suspect.id);
        button.setAttribute("aria-pressed",String(savedSnitchAnswer === suspect.id));
        button.addEventListener("click", () => {
            if (isGamePaused || currentScene?.id !== "snitch-theft") return;
            socket.emit("snitch:answer",{suspectId:suspect.id});
        });
        options.appendChild(button);
    }
    document.getElementById("vnVoteStatus").textContent = savedSnitchAnswer
        ? "Ответ сохранён. Можно изменить до окончания минуты."
        : "Обсудите показания и выберите подозреваемого.";
}
let treeCurrentRole = null;
function appendTreeChat(entry) {
    const list = document.getElementById("treeChatMessages");
    const row = document.createElement("p");
    const name = document.createElement("strong");
    name.textContent = entry.nickname + ": ";
    row.append(name,document.createTextNode(entry.text));
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
}
socket.on("tree:chat_message", entry => {if(currentScene?.type === "tree_spell") appendTreeChat(entry);});
document.getElementById("treeChatForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if(currentScene?.type !== "tree_spell" || isGamePaused) return;
    const input = document.getElementById("treeChatInput");
    if(input.value.trim()) socket.emit("tree:chat_send",{text:input.value});
    input.value = "";
});
function renderTreeSpell(role) {
    stopSnitchFlight();
    for (const id of ["snitchMystery", "garlandFire", "cloakSearch", "potionRecipe", "potionNegativeTest"])
        document.getElementById(id)?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    document.getElementById("treeSpell")?.classList.remove("hidden");
    if (role) treeCurrentRole = role;
    const current = treeCurrentRole;
    const heading = document.getElementById("treeRoleTitle");
    const info = document.getElementById("treeRoleInfo");
    const parts = document.getElementById("treeWordParts");
    parts.replaceChildren();
    if (!current) {
        heading.textContent = "Распределяем роли...";
        info.textContent = "";
        return;
    }
    heading.textContent = current.captain ? "🎩 Ты капитан факультета!" : "🪄 Твои части заклинания";
    info.textContent = current.captain
        ? "Собери слова от участников в правильном порядке и введи всю фразу."
        : "Передай капитану " + current.captainName + " слово и число. Они помогут восстановить порядок.";
    for (const part of current.parts) {
        const card = document.createElement("div");
        card.className = "tree-word-card";
        const word = document.createElement("strong");
        word.textContent = part.word;
        const number = document.createElement("span");
        number.textContent = "Число: " + part.number;
        card.append(word, number);
        parts.appendChild(card);
    }
    document.getElementById("treeSpellForm").classList.toggle("hidden", !current.captain || current.solved);
    document.getElementById("treeSpellFeedback").textContent = current.solved ? "✨ Заклинание собрано! Факультет справился!" : "";
}
socket.on("tree:role", role => {
    treeCurrentRole = role;
    if (currentScene?.type === "tree_spell") renderTreeSpell(role);
});
socket.on("tree:submit_result", ({correct}) => {
    const feedback = document.getElementById("treeSpellFeedback");
    feedback.textContent = correct ? "✨ Верно! Заклинание сработало!" : "Порядок или слова неверны. Попробуй ещё!";
});
socket.on("tree:house_solved", ({house}) => {
    if (currentScene?.type === "tree_spell" && treeCurrentRole && house === treeCurrentRole.house) {
        if (treeCurrentRole) treeCurrentRole.solved = true;
        renderTreeSpell();
    }
});
document.getElementById("treeSpellForm")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!treeCurrentRole?.captain || treeCurrentRole.solved || isGamePaused) return;
    socket.emit("tree:submit", {phrase:document.getElementById("treeSpellInput").value});
});

let negativePotionSelectedIds = [];
let negativePotionOrder = [];
function renderNegativePotionTest(scene, timer, restoredAnswer) {
    const endsAt = timer?.endsAt || Date.now() + scene.duration * 1000;
    if (Array.isArray(restoredAnswer)) negativePotionSelectedIds = restoredAnswer.slice();
    stopSnitchFlight();
    for (const id of ["snitchMystery", "garlandFire", "cloakSearch", "potionRecipe"]) {
        document.getElementById(id)?.classList.add("hidden");
    }
    if (potionPhaseInterval) { clearInterval(potionPhaseInterval); potionPhaseInterval = null; }
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    document.getElementById("potionNegativeTest").classList.remove("hidden");
    document.getElementById("potionNegativeTitle").textContent = scene.title;
    document.getElementById("potionNegativeQuestion").textContent = scene.question;
    const options = document.getElementById("potionNegativeOptions");
    const feedback = document.getElementById("potionNegativeFeedback");
    // Shuffle once, never after a click or timer update.
    if (!negativePotionOrder.length) {
        negativePotionOrder = scene.options.slice();
        for (let i = negativePotionOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [negativePotionOrder[i], negativePotionOrder[j]] = [negativePotionOrder[j], negativePotionOrder[i]];
        }
    }
    function refresh() {
        options.replaceChildren();
        for (const option of negativePotionOrder) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "potion-negative-option";
            button.textContent = (negativePotionSelectedIds.includes(option.id) ? "✓ " : "") + option.label;
            button.classList.toggle("selected", negativePotionSelectedIds.includes(option.id));
            button.setAttribute("aria-pressed", String(negativePotionSelectedIds.includes(option.id)));
            button.disabled = isGamePaused || Date.now() >= endsAt;
            button.addEventListener("click", () => {
                if (currentScene?.type !== "potion_negative_test" || isGamePaused || Date.now() >= endsAt) return;
                if (negativePotionSelectedIds.includes(option.id)) {
                    negativePotionSelectedIds = negativePotionSelectedIds.filter(id => id !== option.id);
                } else if (negativePotionSelectedIds.length < 2) {
                    negativePotionSelectedIds.push(option.id);
                }
                socket.emit("potion-negative:answer", { optionIds: negativePotionSelectedIds });
                refresh();
            });
            options.appendChild(button);
        }
        feedback.textContent = "Выбрано: " + negativePotionSelectedIds.length + " из 2. Ответ можно изменить до окончания времени.";
    }
    refresh();
}
socket.on("potion-negative:answer_result", ({ optionIds }) => {
    if (currentScene?.type === "potion_negative_test" && Array.isArray(optionIds)) {
        negativePotionSelectedIds = optionIds.slice();
    }
});

let potionSelectedIds = [];
let potionPhaseInterval = null;
function renderPotionRecipe(scene, timer, restoredAnswer) {
    if (potionPhaseInterval) clearInterval(potionPhaseInterval);
    potionPhaseInterval = null;
    if (Array.isArray(restoredAnswer)) potionSelectedIds = restoredAnswer.slice();
    stopSnitchFlight();
    for (const id of ["snitchMystery", "garlandFire", "cloakSearch"]) document.getElementById(id)?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    const section = document.getElementById("potionRecipe");
    section.classList.remove("hidden");
    document.getElementById("potionTitle").textContent = scene.title;
    const instructions = document.getElementById("potionInstructions");
    const ingredients = document.getElementById("potionIngredients");
    const parchment = document.getElementById("potionParchment");
    document.getElementById("potionRecipeText").textContent = scene.recipeText;
    const feedback = document.getElementById("potionFeedback");
    const end = timer?.endsAt || Date.now() + scene.duration * 1000;
    const selectionStart = end - (scene.duration - scene.memorizeSeconds) * 1000;
    // Shuffle once per scene rendering, not on each countdown tick or selection.
    const shuffledIngredients = scene.ingredients.slice();
    for (let i = shuffledIngredients.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIngredients[i], shuffledIngredients[j]] = [shuffledIngredients[j], shuffledIngredients[i]];
    }
    // The recipe is shown as prose on parchment, not as a list of ingredients.
    function refresh() {
        if (currentScene?.type !== "potion_recipe") {
            clearInterval(potionPhaseInterval);
            potionPhaseInterval = null;
            return;
        }
        const now = Date.now();
        const memorizing = now < selectionStart;
        const expired = now >= end;
        instructions.textContent = memorizing
            ? "Запомни каждый ингредиент! Рецепт исчезнет через " + Math.ceil((selectionStart - now) / 1000) + " сек."
            : "Выбери ровно 6 ингредиентов по памяти. Можно менять выбор до окончания времени.";
        parchment.classList.toggle("hidden", !memorizing);
        ingredients.classList.toggle("hidden", memorizing);
        ingredients.replaceChildren();
        for (const item of memorizing ? [] : shuffledIngredients) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "potion-ingredient";
            button.textContent = (potionSelectedIds.includes(item.id) ? "✓ " : "") + item.label;
            button.classList.toggle("selected", potionSelectedIds.includes(item.id));
            button.disabled = memorizing || expired || isGamePaused;
            button.addEventListener("click", () => {
                if (Date.now() < selectionStart || Date.now() >= end || isGamePaused) return;
                if (potionSelectedIds.includes(item.id)) potionSelectedIds = potionSelectedIds.filter(id => id !== item.id);
                else if (potionSelectedIds.length < 6) potionSelectedIds.push(item.id);
                socket.emit("potion:answer", { ingredientIds: potionSelectedIds });
                refresh();
            });
            ingredients.appendChild(button);
        }
        feedback.textContent = memorizing ? "Прочитай пергамент и запомни состав зелья." :
            expired ? "Время вышло." : "Выбрано: " + potionSelectedIds.length + " из 6";
    }
    refresh();
    potionPhaseInterval = setInterval(refresh, 1000);
}
socket.on("potion:answer_result", ({ ingredientIds }) => {
    if (currentScene?.type === "potion_recipe" && Array.isArray(ingredientIds)) potionSelectedIds = ingredientIds.slice();
});

let cloakSelectedZone = null;
function renderCloakSearch(scene) {
    stopSnitchFlight();
    document.getElementById("snitchMystery")?.classList.add("hidden");
    document.getElementById("garlandFire")?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    document.getElementById("cloakSearch").classList.remove("hidden");
    document.getElementById("cloakTitle").textContent = scene.title;
    document.getElementById("cloakQuestion").textContent = scene.question;
    const zones = document.getElementById("cloakZones");
    zones.replaceChildren();
    const feedback = document.getElementById("cloakFeedback");
    feedback.textContent = cloakSelectedZone === null ? "Выбери один из четырёх участков." : "Участок выбран. Ответ можно изменить.";
    for (let zone = 0; zone < 4; zone++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cloak-zone cloak-zone-" + zone;
        button.setAttribute("aria-label", "Участок " + (zone + 1));
        button.setAttribute("aria-pressed", String(cloakSelectedZone === zone));
        button.classList.toggle("selected", cloakSelectedZone === zone);
        const rune = document.createElement("span");
        rune.className = "cloak-rune";
        rune.textContent = "✦";
        button.appendChild(rune);
        const label = document.createElement("span");
        label.className = "cloak-zone-label";
        label.textContent = "Участок " + (zone + 1);
        button.appendChild(label);
        button.addEventListener("click", () => {
            if (isGamePaused || currentScene?.type !== "cloak_search") return;
            cloakSelectedZone = zone;
            zones.querySelectorAll("button").forEach((item, index) => {
                item.classList.toggle("selected", index === zone);
                item.setAttribute("aria-pressed", String(index === zone));
            });
            feedback.textContent = "Участок выбран. Ответ можно изменить.";
            socket.emit("cloak:answer", { zone });
        });
        zones.appendChild(button);
    }
}
socket.on("cloak:answer_result", ({ zone }) => {
    if (currentScene?.type === "cloak_search") cloakSelectedZone = zone;
});

let garlandSelectedAnswer = null;
function renderGarlandFire(scene) {
    stopSnitchFlight();
    document.getElementById("snitchMystery")?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    const section = document.getElementById("garlandFire");
    section.classList.remove("hidden");
    document.getElementById("garlandTitle").textContent = scene.title;
    document.getElementById("garlandQuestion").textContent = scene.question;
    const options = document.getElementById("garlandOptions");
    options.replaceChildren();
    const feedback = document.getElementById("garlandFeedback");
    feedback.textContent = garlandSelectedAnswer ? "Заклинание выбрано. До конца времени можно изменить ответ." : "Выбери одно заклинание до окончания таймера.";
    for (const option of scene.options) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "garland-option";
        button.textContent = option.label;
        button.classList.toggle("selected", garlandSelectedAnswer === option.id);
        button.setAttribute("aria-pressed", String(garlandSelectedAnswer === option.id));
        button.addEventListener("click", () => {
            if (isGamePaused || currentScene?.type !== "garland_fire") return;
            garlandSelectedAnswer = option.id;
            options.querySelectorAll("button").forEach(b => {
                const selected = b === button;
                b.classList.toggle("selected", selected);
                b.setAttribute("aria-pressed", String(selected));
            });
            feedback.textContent = "Заклинание выбрано. До конца времени можно изменить ответ.";
            socket.emit("garland:answer", { answerId: option.id });
        });
        options.appendChild(button);
    }
}
socket.on("garland:answer_result", ({ answerId }) => {
    if (currentScene?.type === "garland_fire") garlandSelectedAnswer = answerId;
});

function renderSnitchFlight(scene, timer) {
    stopSnitchFlight();
    document.getElementById("snitchMystery")?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    bugSearch?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    document.getElementById("snitchFlight").classList.remove("hidden");

    const arena = document.getElementById("snitchFlightArena");
    const snitch = document.getElementById("flyingSnitch");
    const img = document.getElementById("flyingSnitchImage");
    const red = "/assets/items/NewYearItems/Snitch_red.png";
    const green = "/assets/items/NewYearItems/Snitch_green.png";
    img.src = red;
    snitch.onclick = (event) => {
        if (!isGamePaused && currentScene?.type === "snitch_flight") {
            const rect = snitch.getBoundingClientRect();
            snitchClickPositions.push({
                x: event.clientX || rect.left + rect.width / 2,
                y: event.clientY || rect.top + rect.height / 2,
                at: Date.now()
            });
            socket.emit("snitch:flight_click");
        }
    };
    flightTimerEndsAt = timer?.endsAt || Date.now() + scene.duration * 1000;
    flightClockOffset = timer?.serverNow ? timer.serverNow - Date.now() : 0;
    let wasGreen = false;
    const update = () => {
        if (currentScene?.type !== "snitch_flight") return;
        const remaining = Math.max(0, flightTimerEndsAt - (Date.now() + flightClockOffset));
        const elapsed = (scene.duration * 1000 - remaining) / 1000;
        const active = !isGamePaused && scene.greenWindows.some(t =>
            elapsed >= t && elapsed < t + scene.greenDurationMs / 1000);
        if (active !== wasGreen) {
            img.src = active ? green : red;
            snitch.classList.toggle("green", active);
            wasGreen = active;
        }
        // Quick, unpredictable darts with brief rests, contained inside the small arena.
        // Keep the Snitch still during green windows so players can click accurately.
        const maxX = Math.max(0, arena.clientWidth - snitch.offsetWidth);
        const maxY = Math.max(0, arena.clientHeight - snitch.offsetHeight);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const hopDuration = 0.52;
        const greenStart = scene.greenWindows.find(t => elapsed >= t && elapsed < t + scene.greenDurationMs / 1000);
        const motionTime = greenStart === undefined ? elapsed : greenStart;
        const hop = Math.floor(motionTime / hopDuration);
        const phase = (motionTime / hopDuration) - hop;
        const randomAt = (step, salt) => {
            const value = Math.sin((step + 1) * 127.1 + salt * 311.7) * 43758.5453;
            return value - Math.floor(value);
        };
        const fromX = hop === 0 ? 0.5 : 0.03 + randomAt(hop - 1, 1) * 0.94;
        const fromY = hop === 0 ? 0.5 : 0.03 + randomAt(hop - 1, 2) * 0.94;
        const toX = 0.03 + randomAt(hop, 1) * 0.94;
        const toY = 0.03 + randomAt(hop, 2) * 0.94;
        // Fast long-range dart followed by a short pause.
        const t = Math.min(1, phase / (0.105 / hopDuration));
        const ease = t * t * (3 - 2 * t);
        const x = reducedMotion ? maxX / 2 : maxX * (fromX + (toX - fromX) * ease);
        const y = reducedMotion ? maxY / 2 : maxY * (fromY + (toY - fromY) * ease);
        snitch.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (remaining > 0) flightAnimationFrame = requestAnimationFrame(update);
    };
    update();
}
socket.on("snitch:flight_result", ({ delta }) => {
    if (currentScene?.type !== "snitch_flight") return;
    const click = snitchClickPositions.shift();
    const snitch = document.getElementById("flyingSnitch");
    const rect = snitch?.getBoundingClientRect();
    const popup = document.createElement("span");
    popup.className = "snitch-score-popup " + (delta > 0 ? "positive" : "negative");
    popup.textContent = delta > 0 ? "+" + delta : String(delta);
    popup.style.left = (click?.x ?? (rect ? rect.left + rect.width / 2 : innerWidth / 2)) + "px";
    popup.style.top = (click?.y ?? (rect ? rect.top + rect.height / 2 : innerHeight / 2)) + "px";
    popup.addEventListener("animationend", () => popup.remove(), { once: true });
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1400);
});

let snitchDialogueIndex = 0;
let snitchTypingTimer = null;
function showSnitchLine(scene) {
    const line = scene.dialogues[snitchDialogueIndex];
    if (!line) return;
    const speaker = document.getElementById("snitchSpeaker");
    const text = document.getElementById("snitchLine");
    const portrait = document.getElementById("snitchPortrait");
    const previous = document.getElementById("snitchPrevious");
    const next = document.getElementById("snitchNext");
    const progress = document.getElementById("snitchProgress");
    speaker.textContent = line.name;
    portrait.src = line.image;
    portrait.alt = line.name;
    portrait.onerror = () => { portrait.style.visibility = "hidden"; };
    portrait.style.visibility = "visible";
    progress.textContent = `${snitchDialogueIndex + 1} / ${scene.dialogues.length}`;
    previous.disabled = snitchDialogueIndex === 0;
    next.disabled = snitchDialogueIndex === scene.dialogues.length - 1;
    clearInterval(snitchTypingTimer);
    let index = 0;
    text.textContent = "";
    snitchTypingTimer = setInterval(() => {
        if (isGamePaused) return;
        index = Math.min(index + 4, line.text.length);
        text.textContent = line.text.slice(0, index);
        if (index === line.text.length) clearInterval(snitchTypingTimer);
    }, 18);
    previous.onclick = () => {
        if (isGamePaused || snitchDialogueIndex === 0) return;
        snitchDialogueIndex--;
        showSnitchLine(scene);
    };
    next.onclick = () => {
        if (isGamePaused || snitchDialogueIndex === scene.dialogues.length - 1) return;
        snitchDialogueIndex++;
        showSnitchLine(scene);
    };
}
function renderSnitchMystery(scene, answer = null) {
    const panel = document.getElementById("snitchMystery");
    if (!panel) return;
    savedSnitchAnswer = answer;
    panel.classList.remove("hidden");
    bugSearch?.classList.add("hidden");
    dialoguePanel?.classList.add("hidden");
    charactersLayer?.replaceChildren();
    if (gameBackground) gameBackground.style.backgroundImage = "none";
    const isAnnouncement = scene.type === "snitch_announcement";
    panel.classList.toggle("snitch-announcement", isAnnouncement);
    document.getElementById("snitchTitle").textContent = isAnnouncement ? "" : "Кто украл Золотой Снитч?";
    document.getElementById("snitchDialogue").classList.remove("hidden");
    document.getElementById("snitchVoting").classList.toggle("hidden", isAnnouncement);
    showSnitchLine(scene);
    if (isAnnouncement) return;
    const suspects = document.getElementById("snitchSuspects");
    suspects.replaceChildren();
    for (const suspect of scene.suspects) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "snitch-suspect";
        const img = document.createElement("img");
        img.className = "snitch-suspect-image";
        img.src = suspect.image;
        img.alt = suspect.name;
        img.onerror = () => { img.style.display = "none"; };
        const name = document.createElement("strong");
        name.textContent = suspect.name;
        const check = document.createElement("span");
        check.className = "snitch-check";
        check.textContent = "✓";
        check.setAttribute("aria-hidden", "true");
        button.append(img, name, check);
        button.disabled = isGamePaused;
        button.setAttribute("aria-pressed", String(savedSnitchAnswer === suspect.id));
        if (savedSnitchAnswer === suspect.id) button.classList.add("selected");
        button.addEventListener("click", () => {
            if (isGamePaused) return;
            socket.emit("snitch:answer", { suspectId: suspect.id });
        });
        suspects.appendChild(button);
    }
    document.getElementById("snitchAnswerStatus").textContent = savedSnitchAnswer
        ? "Выбор сохранён. Его можно изменить до окончания таймера."
        : "";
}
socket.on("snitch:answer_saved", ({ suspectId }) => {
    if (currentScene?.type === "snitch_mystery") {
        savedSnitchAnswer = suspectId;
        if (currentScene.novelVoting) {
            document.querySelectorAll("#vnVoteOptions button").forEach(button => {
                const selected = button.dataset.suspect === suspectId;
                button.classList.toggle("selected",selected);
                button.setAttribute("aria-pressed",String(selected));
            });
            document.getElementById("vnVoteStatus").textContent = "Ответ сохранён. Можно изменить до окончания минуты.";
            return;
        }
        const buttons = document.querySelectorAll("#snitchSuspects .snitch-suspect");
        currentScene.suspects.forEach((suspect, i) => {
            if (buttons[i]) {
                buttons[i].disabled = isGamePaused;
                buttons[i].classList.toggle("selected", suspect.id === suspectId);
                buttons[i].setAttribute("aria-pressed", String(suspect.id === suspectId));
            }
        });
        document.getElementById("snitchAnswerStatus").textContent = "Выбор сохранён. Его можно изменить до окончания таймера.";
    }
});

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
        stopSnitchFlight();
        document.getElementById("garlandFire")?.classList.add("hidden");
        document.getElementById("cloakSearch")?.classList.add("hidden");
        document.getElementById("potionRecipe")?.classList.add("hidden");
        document.getElementById("potionNegativeTest")?.classList.add("hidden");
        document.getElementById("treeSpell")?.classList.add("hidden");
        document.getElementById("visualNovel")?.classList.add("hidden");
        if (scene.type === "tree_spell") { treeCurrentRole = null; document.getElementById("treeSpellInput").value = ""; document.getElementById("treeChatMessages").replaceChildren(); }
        if (scene.type === "potion_negative_test") { negativePotionSelectedIds = []; negativePotionOrder = []; }
        if (potionPhaseInterval) { clearInterval(potionPhaseInterval); potionPhaseInterval = null; }
        if (scene.type === "potion_recipe") potionSelectedIds = [];
        if (scene.type === "garland_fire") garlandSelectedAnswer = null;
        if (scene.type === "cloak_search") cloakSelectedZone = null;

        // Запускаем общий таймер сцены
        if (timer && timer.endsAt) {

            startSceneTimer(
                timer.endsAt,
                timer.serverNow
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

        if (scene.novelVoting) {
            hideSceneTransition();
            renderNovelVoting(scene);
            return;
        }
        if (scene.type === "visual_novel") {
            hideSceneTransition();
            renderVisualNovel(scene);
            return;
        }
        if (scene.type === "tree_spell") {
            hideSceneTransition();
            renderTreeSpell();
            return;
        }
        if (scene.type === "potion_negative_test") {
            hideSceneTransition();
            renderNegativePotionTest(scene, timer);
            return;
        }
        if (scene.type === "potion_recipe") {
            hideSceneTransition();
            renderPotionRecipe(scene, timer);
            return;
        }
        if (scene.type === "cloak_search") {
            hideSceneTransition();
            renderCloakSearch(scene);
            return;
        }
        if (scene.type === "garland_fire") {
            hideSceneTransition();
            renderGarlandFire(scene);
            return;
        }
        if (scene.type === "snitch_flight") {
            hideSceneTransition();
            renderSnitchFlight(scene, timer);
            return;
        }
        if (scene.type === "snitch_mystery" || scene.type === "snitch_announcement") {
            hideSceneTransition();
            snitchDialogueIndex = 0;
            renderSnitchMystery(scene);
            return;
        }
        document.getElementById("snitchMystery")?.classList.add("hidden");
        if (dialoguePanel) dialoguePanel.classList.remove("hidden");

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
                timer.endsAt,
                timer.serverNow
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
    ({ results, houseScores, correctSuspectId }) => {

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
        if (correctSuspectId === "ron" && !houseScores) {
            const answer = document.createElement("p");
            answer.textContent = "Итак, вор — Рональд Рандомли! Снитч найден и возвращён. Но это только начало! Первое испытание Турнира — поймать снитч!";
            resultsList.appendChild(answer);
            return;
        }

        if (houseScores) {
            const heading = document.createElement("h2");
            heading.textContent = "🏆 Турнир Четырёх Факультетов — итоговый рейтинг";
            resultsList.appendChild(heading);
            const names = {
                gryffindor: "🦁 Гриффиндев", slytherin: "🐍 Фичерин",
                ravenclaw: "🦅 Кодтевран", hufflepuff: "🦡 Пуффентест"
            };
            const sorted = Object.entries(houseScores).sort((a, b) => b[1] - a[1]);
            for (const [house, score] of sorted) {
                const row = document.createElement("p");
                row.textContent = `${names[house] || house}: ${score} очков`;
                resultsList.appendChild(row);
            }
            const winner = sorted[0];
            if (winner) {
                const win = document.createElement("h2");
                win.textContent = "🏆 Победитель: " + (names[winner[0]] || winner[0]);
                resultsList.prepend(win);
            }
            const personal = document.createElement("h3");
            personal.textContent = "Личные результаты";
            resultsList.appendChild(personal);
            for (const player of results || []) {
                const line = document.createElement("p");
                line.textContent = player.nickname + " — " + player.score + " очков";
                resultsList.appendChild(line);
            }
            if (correctSuspectId) {
                const answer = document.createElement("p");
                answer.textContent = "Итак, вор — Рональд Рандомли! Снитч найден и возвращён. Но это только начало! Первое испытание Турнира — поймать снитч!";
                resultsList.appendChild(answer);
            }
            return;
        }

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