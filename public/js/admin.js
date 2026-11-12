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
const pauseGameButton =
    document.getElementById(
        "pauseGameButton"
    );

const gameCodeElement =
    document.getElementById(
        "gameCode"
    );

const playerCountElement =
    document.getElementById(
        "playerCount"
    );


const HOUSE_NAMES = {
    gryffindor: "🦁 Гриффиндор",
    slytherin: "🐍 Слизерин",
    ravenclaw: "🦅 Когтевран",
    hufflepuff: "🦡 Пуффендуй"
};
const houseCounts = Object.fromEntries(
    Object.keys(HOUSE_NAMES).map(id => [id, document.getElementById(id + "Count")])
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

socket.on("lobby:update", ({ players }) => {
    playerCountElement.textContent = players.length;
    const counts = Object.fromEntries(Object.keys(HOUSE_NAMES).map(id => [id, 0]));
    playerList.replaceChildren();
    for (const player of players) {
        if (player.house in counts) counts[player.house]++;
        const row = document.createElement("div");
        row.className = "player-row";
        const name = document.createElement("span");
        name.className = "player-name";
        name.textContent = player.nickname;
        const house = document.createElement("span");
        house.className = "player-team";
        house.textContent = HOUSE_NAMES[player.house] || "Не распределён";
        const kick = document.createElement("button");
        kick.className = "kick-button";
        kick.textContent = "ВЫГНАТЬ";
        kick.addEventListener("click", () => {
            if (confirm(`Выгнать игрока "${player.nickname}"?`)) {
                socket.emit("admin:kick_player", { playerId: player.id });
            }
        });
        row.append(name, house, kick);
        playerList.appendChild(row);
    }
    for (const [id, el] of Object.entries(houseCounts)) {
        if (el) el.textContent = counts[id];
    }
    startGameButton.disabled = players.length === 0 || players.some(player => !player.house);
    adminStatus.textContent = players.length
        ? "Факультеты распределены. Можно начинать!"
        : "Ожидаем игроков...";
});

// ==================================================
// START GAME
// ==================================================

startGameButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "Факультеты распределены.\n\nНачать игру?"
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


        startGameButton.disabled =
            true;


        pauseGameButton.classList.remove(
            "hidden"
        );


        pauseGameButton.disabled =
            false;


        pauseGameButton.textContent =
            "⏸ ПАУЗА";

    }
);

// ==================================================
// PAUSE / RESUME GAME
// ==================================================

pauseGameButton.addEventListener(
    "click",
    () => {

        const isPaused =
            pauseGameButton.dataset.paused === "true";


        const message =
            isPaused
                ? "Продолжить игру?"
                : "Поставить игру на паузу?";


        const confirmed =
            confirm(message);


        if (!confirmed) {
            return;
        }


        pauseGameButton.disabled =
            true;


        socket.emit(
            "admin:pause_game"
        );

    }
);

socket.on(
    "admin:pause_changed",
    ({ paused }) => {

        pauseGameButton.disabled =
            false;


        pauseGameButton.dataset.paused =
            String(paused);


        if (paused) {

            pauseGameButton.textContent =
                "▶ ПРОДОЛЖИТЬ";


            adminStatus.textContent =
                "⏸ ИГРА НА ПАУЗЕ";

        } else {

            pauseGameButton.textContent =
                "⏸ ПАУЗА";


            adminStatus.textContent =
                "🚀 ИГРА ПРОДОЛЖАЕТСЯ";

        }

    }
);

socket.on(
    "admin:pause_error",
    ({ message }) => {

        console.error(
            message
        );


        pauseGameButton.disabled =
            false;


        adminStatus.textContent =
            message;

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