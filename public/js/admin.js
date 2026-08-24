const socket = io();

console.log(
    "admin.js загружен"
);


// ==================================================
// ELEMENTS
// ==================================================
const lobbyLink =
    document.getElementById(
        "lobbyLink"
    );

const copyLobbyLinkButton =
    document.getElementById(
        "copyLobbyLinkButton"
    );

const copyStatus =
    document.getElementById(
        "copyStatus"
    );

const createGameSection =
    document.getElementById(
        "createGameSection"
    );

const gameSection =
    document.getElementById(
        "gameSection"
    );


const createGameButton =
    document.getElementById(
        "createGameButton"
    );

const startGameButton =
    document.getElementById(
        "startGameButton"
    );


const gameCodeElement =
    document.getElementById(
        "gameCode"
    );

const playerCountElement =
    document.getElementById(
        "playerCount"
    );


const strategistCount =
    document.getElementById(
        "strategistCount"
    );

const jokerCount =
    document.getElementById(
        "jokerCount"
    );

const criticCount =
    document.getElementById(
        "criticCount"
    );


const playerList =
    document.getElementById(
        "playerList"
    );

const adminStatus =
    document.getElementById(
        "adminStatus"
    );


// ==================================================
// CREATE GAME
// ==================================================

createGameButton.addEventListener(
    "click",
    () => {

        console.log(
            "Создаём игру..."
        );

        createGameButton.disabled =
            true;

        createGameButton.textContent =
            "СОЗДАНИЕ...";

        socket.emit(
            "admin:create_game"
        );

    }
);


// ==================================================
// GAME CREATED
// ==================================================

socket.on(
    "admin:game_created",
    ({ gameId }) => {

        console.log(
            "Игра создана:",
            gameId
        );

        gameCodeElement.textContent =
            gameId;
            
        const playerUrl =
            `${window.location.origin}/?game=${gameId}`;
        
        lobbyLink.value =
            playerUrl;
        
        console.log(
            "Ссылка для игроков:",
            playerUrl
        );


        createGameSection.classList.add(
            "hidden"
        );


        gameSection.classList.remove(
            "hidden"
        );


        adminStatus.textContent =
            "Ожидаем игроков...";


        // Очень полезно:
        // показываем ссылку игрокам

        console.log(
            "Ссылка для игроков:",
            `${window.location.origin}/?game=${gameId}`
        );

    }
);


// ==================================================
// LOBBY UPDATE
// ==================================================

socket.on(
    "lobby:update",
    ({ players }) => {

        console.log(
            "Lobby update:",
            players
        );


        // ------------------------------------------
        // TOTAL
        // ------------------------------------------

        playerCountElement.textContent =
            players.length;


        // ------------------------------------------
        // TEAM COUNTERS
        // ------------------------------------------

        let strategist = 0;
        let joker = 0;
        let critic = 0;


        // ------------------------------------------
        // ALL TEAMS?
        // ------------------------------------------

        let allTeamsSelected =
            players.length > 0;


        // ------------------------------------------
        // PLAYER LIST
        // ------------------------------------------

        playerList.innerHTML = "";


        players.forEach(
            (player) => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "player-row";


                let teamName =
                    "Команда не выбрана";


                let teamIcon =
                    "❔";


                if (
                    player.team ===
                    "strategist"
                ) {

                    strategist++;

                    teamName =
                        "Стратеги";

                    teamIcon =
                        "🧠";

                }


                if (
                    player.team ===
                    "joker"
                ) {

                    joker++;

                    teamName =
                        "Шутники";

                    teamIcon =
                        "😎";

                }


                if (
                    player.team ===
                    "critic"
                ) {

                    critic++;

                    teamName =
                        "Критики";

                    teamIcon =
                        "🔎";

                }


                if (!player.team) {

                    allTeamsSelected =
                        false;

                }


                row.innerHTML = `

    <span class="player-name">
        ${escapeHtml(player.nickname)}
    </span>

    <span class="player-team">
        ${teamIcon}
        ${teamName}
    </span>

    <button
        class="kick-button"
        data-player-id="${player.id}"
    >
        ВЫГНАТЬ
    </button>

`;


                playerList.appendChild(
                    row
                );
                const kickButton =
    row.querySelector(".kick-button");


kickButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                `Выгнать игрока "${player.nickname}"?`
            );


        if (!confirmed) {
            return;
        }


        socket.emit(
            "admin:kick_player",
            {
                playerId: player.id
            }
        );

    }
);

            }
        );


        // ------------------------------------------
        // COUNTERS
        // ------------------------------------------

        strategistCount.textContent =
            strategist;

        jokerCount.textContent =
            joker;

        criticCount.textContent =
            critic;


        // ------------------------------------------
        // START BUTTON
        // ------------------------------------------

        startGameButton.disabled =
            !allTeamsSelected;


        // ------------------------------------------
        // STATUS
        // ------------------------------------------

        if (players.length === 0) {

            adminStatus.textContent =
                "Ожидаем игроков...";

        }

        else if (!allTeamsSelected) {

            const waiting =
                players.filter(
                    player =>
                        !player.team
                ).length;


            adminStatus.textContent =
                `Ожидаем выбора команды: ${waiting}`;

        }

        else {

            adminStatus.textContent =
                "Все игроки выбрали команды. Можно начинать!";

        }

    }
);


// ==================================================
// START GAME
// ==================================================

startGameButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Все игроки выбрали команды.\n\nНачать игру?"
            );


        if (!confirmed) {
            return;
        }


        console.log(
            "Запускаем игру..."
        );


        startGameButton.disabled =
            true;


        startGameButton.textContent =
            "ЗАПУСК ИГРЫ...";


        socket.emit(
            "admin:start_game"
        );

    }
);


// ==================================================
// START ERROR
// ==================================================

socket.on(
    "admin:start_error",
    ({ message }) => {

        console.error(
            message
        );


        adminStatus.textContent =
            message;


        startGameButton.disabled =
            false;


        startGameButton.textContent =
            "🚀 НАЧАТЬ ИГРУ";

    }
);


// ==================================================
// GAME STARTED
// ==================================================

socket.on(
    "game:started",
    ({ scene }) => {

        console.log(
            "Игра началась!",
            scene
        );


        adminStatus.textContent =
            "🚀 ИГРА ЗАПУЩЕНА";


        startGameButton.textContent =
            "ИГРА ИДЁТ";

    }
);


// ==================================================
// HTML ESCAPE
// ==================================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

};

copyLobbyLinkButton.addEventListener(
    "click",
    async () => {

        try {

            await navigator.clipboard.writeText(
                lobbyLink.value
            );


            copyStatus.textContent =
                "✓ Ссылка скопирована";


            setTimeout(
                () => {

                    copyStatus.textContent =
                        "";

                },
                2000
            );

        } catch (error) {

            console.error(
                "Не удалось скопировать ссылку:",
                error
            );


            lobbyLink.select();

            document.execCommand(
                "copy"
            );


            copyStatus.textContent =
                "✓ Ссылка скопирована";

        }

    }
);