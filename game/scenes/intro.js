module.exports = {
    id: "intro",
    nextSceneId: "alice",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/office_bckg.png",
    character: {
        name: "Йода",
        image: "/assets/characters/Yoda_portr.png"
    },
    voice: "/assets/sounds/Scene3_Yoda_mission.wav",
    text: "Миссия проста: найти уязвимость в прошивке. Империя говорит, что релиз готов. Но Сила подсказывает мне: что-то здесь не так. Проверить всё вы должны. Каждый баг, который найдёте вы, приблизит нас к цели. Помните: один баг — не проблема. Сто багов — катастрофа. А тысяча багов — это уже не баги, а легаси",
    voting: {
        enabled: true,
        duration: 35,
        tieBreak: "revote",
        revoteDuration: 15
    },
    transition: {
        title: "Алиса присоединяется к команде",
        text: "Голограмма появляется посреди офиса..."
    },
    choices: [
        {
            id: "strategist",
            team: "strategist",
            text: "Мы всё задокументируем",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "path",
            transitionText: "Команда решает всё задокументировать..."
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Легаси? Звучит как джазовый альбом",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            transitionText: "Кажется, кто-то слишком любит легаси..."
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Очередной «идеальный» релиз. Сейчас мы им покажем",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "alice",
            transitionText: "Команда решает разобраться во всём лично..."
        }
    ]
};
