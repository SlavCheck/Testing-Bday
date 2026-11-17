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

const CLASSIC_TEAM_NAMES = {
    strategist: "📋 Стратеги",
    joker: "🎭 Шутники",
    critic: "🔎 Критики"
};
const classicCounts = Object.fromEntries(Object.keys(CLASSIC_TEAM_NAMES).map(id => [id, document.getElementById(id + "Count")]));
let currentAdminGameType = "harry-potter";
function showGameTeamCards(gameType) {
    currentAdminGameType = gameType === "classic" ? "classic" : "harry-potter";
    document.getElementById("houseTeamCards").classList.toggle("hidden", currentAdminGameType === "classic");
    document.getElementById("classicTeamCards").classList.toggle("hidden", currentAdminGameType !== "classic");
    document.getElementById("devScenePanel")?.classList.toggle("hidden", currentAdminGameType === "classic");
}

const playerList =
    document.getElementById(
        "playerList"
    );

const adminStatus =
    document.getElementById(
        "adminStatus"
    );


const ADMIN_SESSION_KEY = "testingBday_adminSession";
function showAdminGame(gameId, status = "lobby", gameType = "harry-potter") {
    adminGameTypeLabel.textContent = GAME_MODE_LABELS[gameType] || GAME_MODE_LABELS["harry-potter"];
    showGameTeamCards(gameType);
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
socket.on("admin:game_restored", ({ gameId, status, gameType }) => showAdminGame(gameId, status, gameType));
socket.on("admin:restore_error", ({ message }) => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    createGameSection.classList.remove("hidden");
    gameSection.classList.add("hidden");
    createGameButton.disabled = false;
    createGameButton.textContent = "⚡ СОЗДАТЬ ГАРРИ ПОТТЕР: БИТВА ЗА НОВЫЙ ГОД";
    document.getElementById("createClassicGameButton").disabled = false;
    console.warn(message);
});

// ==================================================
// CREATE GAME
// ==================================================

const createClassicGameButton = document.getElementById("createClassicGameButton");
const adminGameTypeLabel = document.getElementById("adminGameTypeLabel");
const GAME_MODE_LABELS = {
    classic: "🚀 Star Test Quest",
    "harry-potter": "⚡ Гарри Поттер: Битва за Новый год"
};
function createGameOfType(gameType) {
    createGameButton.disabled = true;
    createClassicGameButton.disabled = true;
    socket.emit("admin:create_game", { gameType });
}
createGameButton.addEventListener("click", () => createGameOfType("harry-potter"));
createClassicGameButton.addEventListener("click", () => createGameOfType("classic"));

// ==================================================
// GAME CREATED
// ==================================================

socket.on("admin:game_created", ({ gameId, gameType, adminToken }) => {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ gameId, adminToken }));
    showAdminGame(gameId, "lobby", gameType);
});

// ==================================================
// LOBBY UPDATE
// ==================================================

socket.on("lobby:update", ({ players, gameType }) => {
    if (gameType) showGameTeamCards(gameType);
    playerCountElement.textContent = players.length;
    const counts = Object.fromEntries(Object.keys(HOUSE_NAMES).map(id => [id, 0]));
    const teamCounts = Object.fromEntries(Object.keys(CLASSIC_TEAM_NAMES).map(id => [id, 0]));
    playerList.replaceChildren();
    for (const player of players) {
        if (player.house in counts) counts[player.house]++;
        if (player.team in teamCounts) teamCounts[player.team]++;
        const row = document.createElement("div");
        row.className = "player-row";
        const name = document.createElement("span");
        name.className = "player-name";
        name.textContent = player.nickname;
        const house = document.createElement("span");
        house.className = "player-team";
        house.textContent = currentAdminGameType === "classic"
            ? (CLASSIC_TEAM_NAMES[player.team] || "Не распределён")
            : (HOUSE_NAMES[player.house] || "Не распределён");
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
    for (const [id, el] of Object.entries(classicCounts)) {
        if (el) el.textContent = teamCounts[id];
    }
    startGameButton.disabled = players.length === 0 || players.some(player => currentAdminGameType === "classic" ? !player.team : !player.house);
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
document.getElementById("devSceneJump")?.addEventListener("click", () => {
    const sceneId = document.getElementById("devSceneSelect").value;
    socket.emit("admin:jump_scene", { sceneId });
});
for (const [buttonId, sceneId] of [["devPotionIntro", "potion-intro"], ["devPotionRecipe", "potion-recipe"]]) {
    document.getElementById(buttonId)?.addEventListener("click", () => {
        document.getElementById("devSceneSelect").value = sceneId;
        const status = document.getElementById("devSceneStatus");
        if (status) status.textContent = "Переключаем сцену...";
        socket.emit("admin:jump_scene", { sceneId });
    });
}
socket.on("admin:jump_scene_result", ({ sceneId }) => {
    const status = document.getElementById("devSceneStatus");
    if (status) status.textContent = "Сцена переключена: " + sceneId;
});
