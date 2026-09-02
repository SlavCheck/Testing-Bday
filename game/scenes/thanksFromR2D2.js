module.exports = {
    id: "thanksFromR2D2",
    nextSceneId: "serverDoorClosed",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverDoorR2D2.png",
    character: {
        name: "R2-D2",
        image: "/assets/characters/R3D3_portr_succes.png"
    },
    voice: "/assets/sounds/Scene14_r3d3_second_scene.wav",
    text: "Бип-буп-бип-буп! (перевод: «Работает! Вы починили меня! Спасибо, тестировщики!») «Бип-бип!» (перевод: «В благодарность я дам вам кое-что полезное. Выбирайте!»)",
    voting: {
        enabled: true,
        duration: 35,
        tieBreak: "revote",
        revoteDuration: 15
    },
    transition: {
        title: "Заголовок",
        text: "Текст"
    },
    choices: [
        {
            id: "strategist",
            team: "strategist",
            text: "📝 Бумажка — «Берём бумажку. Кто знает, может, там важная информация»",
            points: {
                ownTeam: 15,
                otherTeam: 15
            },
            nextSceneId: "serverDoorClosed",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "💰 Деньги — «Деньги! Всегда пригодятся»",
            points: {
                ownTeam: 30,
                otherTeam: 30
            },
            nextSceneId: "serverDoorClosed",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "🤝 Пойти дальше — «Спасибо, но нам ничего не нужно. У нас миссия»",
            points: {
                ownTeam: 50,
                otherTeam: 50
            },
            nextSceneId: "serverDoorClosed",
            transitionText: "Текст3"
        }
    ]
};
