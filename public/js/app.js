const socket = io();

// ==================================================
// VOICE
// ==================================================

let voiceEnabled =
    localStorage.getItem("starTestQuest_voiceEnabled") !== "false";
let currentScene = null;
let currentVoice = null;
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


if (!playerId) {

    playerId =
        crypto.randomUUID();

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

const characterName =
    document.getElementById(
        "characterName"
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

// ==================================================
// GAME CODE FROM URL
// ==================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const gameId =
    params.get("game");


console.log(
    "Код игры:",
    gameId
);

// ==================================================
// SCENE TIMER
// ==================================================

function stopSceneTimer() {

    if (sceneTimerInterval) {

        clearInterval(
            sceneTimerInterval
        );

        sceneTimerInterval = null;

    }

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

function startSceneTimer(endsAt) {

    stopSceneTimer();

    if (!endsAt) {

        updateSceneTimer(0);

        return;

    }

    function tick() {

        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (endsAt - Date.now()) / 1000
                )
            );

        updateSceneTimer(
            remaining
        );

        if (remaining <= 0) {

            stopSceneTimer();

        }

    }

    tick();

    sceneTimerInterval =
        setInterval(
            tick,
            250
        );

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
function renderBugSearchScene(scene) {

    console.log(
        "Запускаем сцену поиска багов:",
        scene
    );

    // Убираем персонажей предыдущей сцены
    if (charactersLayer) {
        charactersLayer.innerHTML = "";
    }

    if (characterName) {
        characterName.textContent = "";
    }

    // ------------------------------------------
    // СОСТОЯНИЕ
    // ------------------------------------------

    bugSearchState = {

        mistakes: 0,

        found: 0,

        finished: false,

        cards: scene.cards || [],

        currentIndex: 0,

        scene: scene

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

    function updateSceneTimer() {

        const remaining =
            Math.max(
                0,
                sceneTimerEndsAt - Date.now()
            );

        const seconds =
            Math.ceil(
                remaining / 1000
            );

        const minutes =
            Math.floor(seconds / 60);

        const secs =
            seconds % 60;

        sceneTimer.textContent =
            `⏱ ${minutes}:${String(secs).padStart(2, "0")}`;

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


function stopSceneTimer() {

    if (sceneTimerInterval) {

        clearInterval(
            sceneTimerInterval
        );

        sceneTimerInterval = null;
    }

    if (sceneTimer) {
        sceneTimer.textContent =
            "⏱ 0:00";
    }

    sceneTimerEndsAt = null;
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


        // ------------------------------------------
        // ПРОБУЕМ ВОССТАНОВИТЬ ИГРОКА
        // ------------------------------------------

        if (
            gameId &&
            playerId &&
            savedNickname
        ) {

            console.log(
                "Пробуем восстановить игрока..."
            );


            socket.emit(
                "player:join_game",
                {
                    gameId,
                    nickname:
                        savedNickname,
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

    localStorage.setItem(
        "starTestQuest_nickname",
        nickname
    );


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


    joinButton.disabled =
        true;

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
    ({ nickname }) => {

        console.log("Игрок вошёл:", nickname);

        if (welcomeVoice) {
            welcomeVoice.pause();
            welcomeVoice.currentTime = 0;
        }

        playerNickname.textContent = nickname;

        // Скрываем все экраны
        joinScreen.classList.add("hidden");
        lobbyScreen.classList.add("hidden");
        waitingScreen.classList.add("hidden");
        gameScreen.classList.add("hidden");

        // Показываем выбор команды
        teamScreen.classList.remove("hidden");

        // ------------------------------------------
        // ОЗВУЧКА ВЫБОРА КОМАНДЫ
        // ------------------------------------------
        if (voiceEnabled && teamVoice) {
            stopVoice();
        
            currentVoice = teamVoice;
        
            teamVoice.currentTime = 0;
        
            teamVoice.play().catch(error => {
                console.warn(
                    "Не удалось запустить озвучку выбора команды:",
                    error
                );
            });
        }

        console.log("Игрок находится на экране выбора команды.");
    }
);


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
                    player.id === socket.id
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
        
            // Очищаем имя персонажа
            if (characterName) {
        
                characterName.textContent = "";
        
            }
        
            // ------------------------------------------
            // СКРЫВАЕМ TRANSITION
            // ------------------------------------------
        
            hideSceneTransition();
        
            // ------------------------------------------
            // ЗАПУСКАЕМ BUG SEARCH
            // ------------------------------------------
        
            renderBugSearchScene(scene);
        
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
                // ИМЯ
                // ----------------------------------

                if (
                    characterName &&
                    scene.character
                ) {

                    characterName.textContent =
                        scene.character.name;

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