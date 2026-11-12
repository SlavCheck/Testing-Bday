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


const ADMIN_SESSION_KEY = "testingBday_adminSession";
function showAdminGame(gameId, status = "lobby") {
    gameCodeElement.textContent = gameId;
    lobbyLink.value = `${window.location.origin}/?game=${gameId}`;
    createGameSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    const isLobby = status === "lobby";
    const paused = status === "paused";
    startGameButton.disabled = !isLobby;
    startGameButton.textContent = isLobby ? "🚀 НАЧАТЬ ИГРУ" : "ИГРА ИДЁТ";
    pauseGameButton.classList.toggle("hidden", isLobby || status === "finished");
    pauseGameButton.disabled = isLobby || status === "finished";
    pauseGameButton.dataset.paused = String(paused);
    pauseGameButton.textContent = paused ? "▶ ПРОДОЛЖИТЬ" : "⏸ ПАУЗА";
    adminStatus.textContent = isLobby ? "Ожидаем игроков..." :
        paused ? "⏸ ИГРА НА ПАУЗЕ" :
        status === "finished" ? "Игра завершена" : "🚀 ИГРА ЗАПУЩЕНА";
}
socket.on("connect", () => {
    const saved = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!saved) return;
    try {
        const session = JSON.parse(saved);
        if (session.gameId && session.adminToken) socket.emit("admin:restore_game", session);
    } catch { localStorage.removeItem(ADMIN_SESSION_KEY); }
});
socket.on("admin:game_restored", ({ gameId, status }) => showAdminGame(gameId, status));
socket.on("admin:restore_error", ({ message }) => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    createGameSection.classList.remove("hidden");
    gameSection.classList.add("hidden");
    createGameButton.disabled = false;
    createGameButton.textContent = "СОЗДАТЬ ИГРУ";
    console.warn(message);
});

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

socket.on("admin:game_created", ({ gameId, adminToken }) => {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ gameId, adminToken }));
    showAdminGame(gameId, "lobby");
});

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