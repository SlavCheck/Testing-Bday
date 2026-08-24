const socket = io();

// ==================================================
// VOICE
// ==================================================

let voiceEnabled =
    localStorage.getItem("starTestQuest_voiceEnabled") !== "false";
let currentScene = null;
let currentVoice = null;


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


                // Блокируем все кнопки
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
    ({ scene }) => {

        // ------------------------------------------
        // ИГРА ЗАПУЩЕНА
        // ------------------------------------------

        console.log(
            "Получена новая сцена:"
        );


        // Скрываем lobby

        lobbyScreen.classList.add(
            "hidden"
        );


        // Скрываем старые экраны

        gameScreen.classList.add(
            "hidden"
        );

        waitingScreen.classList.add("hidden");

        gameScreen.classList.remove("hidden");
        
        currentScene = scene;
        console.log(
            "Переход к сцене:",
            scene.id
        );

        // Останавливаем озвучку стартового экрана
        if (welcomeVoice) {

            welcomeVoice.pause();

            welcomeVoice.currentTime = 0;

        }
        transitionToScene(
            () => {

                // ------------------------------------------
                // ПОКАЗЫВАЕМ ИГРОВОЙ ЭКРАН
                // ------------------------------------------

                joinScreen.classList.add("hidden");
                lobbyScreen.classList.add("hidden");
                teamScreen.classList.add("hidden");
                waitingScreen.classList.add("hidden");

                // ------------------------------------------
                // ФОН
                // ------------------------------------------

                if (
                    gameBackground &&
                    scene.background
                ) {

                    gameBackground.style.backgroundImage =
                        `url("${scene.background}")`;

                }
                // ------------------------------------------
                // ПЕРСОНАЖИ
                // ------------------------------------------

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
                        
                                // ==========================================
                                // РАМКА ПЕРСОНАЖА
                                // ==========================================
                        
                                const characterFrame =
                                    document.createElement("div");
                        
                                characterFrame.className =
                                    "character-frame";
                        
                        
                                // ==========================================
                                // ИЗОБРАЖЕНИЕ ПЕРСОНАЖА
                                // ==========================================
                        
                                const image =
                                    document.createElement("img");
                        
                                image.className =
                                    "character-avatar";
                        
                                image.src =
                                    character.image;
                        
                                image.alt =
                                    character.name || "";
                        
                        
                                // ==========================================
                                // ИМЯ ПЕРСОНАЖА
                                // ==========================================
                        
                                const name =
                                    document.createElement("div");
                        
                                name.className =
                                    "character-frame-name";
                        
                                name.textContent =
                                    character.name || "";
                        
                        
                                // ==========================================
                                // СОБИРАЕМ
                                // ==========================================
                        
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

                // ------------------------------------------
                // ИМЯ
                // ------------------------------------------

                if (
                    characterName &&
                    scene.character
                ) {

                    characterName.textContent =
                        scene.character.name;

                }


                // ------------------------------------------
                // ТЕКСТ
                // ------------------------------------------

                if (dialogueText) {

                    dialogueText.textContent =
                        scene.text;

                }

                // ------------------------------------------
                // ОЗВУЧКА СЦЕНЫ
                // ------------------------------------------

                playVoice(
                    scene.voice
                );

                // ------------------------------------------
                // ВАРИАНТЫ
                // ------------------------------------------

                if (choiceButtons) {

                    choiceButtons.innerHTML = "";


                    scene.choices.forEach(
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
        console.log(`Начался ревот (раунд ${round}) – доступны варианты:`, tiedChoices);
        console.log(`Время до окончания ревота: ${duration} сек`);

        // Сбрасываем визуальное выделение кнопок
        const buttons = choiceButtons.querySelectorAll("button");
        buttons.forEach(btn => btn.classList.remove("selected"));

        // Можно добавить подсказку в UI, например:
        const status = document.getElementById("teamStatus") || document.createElement("p");
        status.textContent = `Ревот! Выберите один из вариантов: ${tiedChoices.join(", ")}`;
        if (!status.parentElement) document.body.appendChild(status);
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