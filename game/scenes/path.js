// game/scenes/path.js
module.exports = {
    // ==== Идентификатор сцены =================================================
    id: "path",

    // ==== fallback‑next (если выбран вариант без собственного nextSceneId) ===
    // Если ни один из вариантов не задаёт nextSceneId, будет использован этот.
    // Вы можете изменить его на любую сцену, которую хотите показывать по‑умолчанию.
    nextSceneId: "cafeteria",   // «по‑умолчанию» – умные устройства

    // ==== Визуальное оформление ==============================================
    background: "/assets/backgrounds/space_station_control_panel_bckg.png",
    voice: "/assets/sounds/Scene5_Alice_search_bugs.wav",
    character: {
        name: "Алиса",
        image: "/assets/characters/alice_portr.png"
    },

    // ==== Текст, который увидит игрок =========================================
    text: "Вот панель управления. Империя утверждает, что всё работает идеально. Но Сила подсказывает: здесь есть баги. Найдите их!",

    // ==== Голосование (включено, как в intro) ================================
    voting: {
        enabled: true,
        duration: 30,            // 30 секунд на первый раунд
        tieBreak: "revote",      // при ничье – ревот
        revoteDuration: 15       // длительность ревота
    },

    // ==== Варианты выбора =====================================================
    // Каждый вариант имеет:
    //   id          – уникальный id (используется в сообщениях)
    //   team        – к какой команде относится (не обязателен для логики)
    //   text        – надпись на кнопке
    //   points      – очки (у вас они уже считаются в awardVotingPoints)
    //   nextSceneId – * ветвление * – в какую сцену перейти, если этот вариант победит
    choices: [
        {
            id: "goServer",
            team: "strategist",
            text: "Пойти к серверной",
            points: { ownTeam: 30, otherTeam: 10 },
            nextSceneId: "serverRoom"      // → сцена serverRoom.js
        },
        {
            id: "goCafeteria",
            team: "joker",
            text: "Зайти в столовую",
            points: { ownTeam: 30, otherTeam: 10 },
            nextSceneId: "cafeteria"       // → сцена cafeteria.js
        },
        {
            id: "exploreRoom",
            team: "critic",
            text: "Исследовать комнату умных устройств",
            points: { ownTeam: 30, otherTeam: 10 },
            nextSceneId: "smartRoom"       // → сцена smartRoom.js
        }
    ]
};
