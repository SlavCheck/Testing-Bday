module.exports = {

    id: "finalScene",

    nextSceneId: "",

    background:
        "/assets/backgrounds/serverRoomLight.png",

    finalCharacters: [

        {
            name: "Йода",
            image:
                "/assets/characters/Yoda_portr.png",
            voice:
                "/assets/sounds/Scene20A_Yoda_finish.wav",
            text:
                "Вейдера победили вы. Релиз спасли. Но помните: баги — как трава. Выполоть их можно, но вырастут снова. Однако теперь знаете вы: вместе — вы сила.",
            duration: 17000
        },

        {
            name: "Чубакка",
            image:
                "/assets/characters/Chubakka_portr.png",
            voice:
                "/assets/sounds/Scene20D_Chui.wav",
            text:
                "Вы — молодцы! Но кофе... кофе всё ещё ужасный. Я уже думаю завести баг-репорт на зёрна",
            duration: 8000
        },

        {
            name: "Алиса",
            image:
                "/assets/characters/alice_portr.png",
            voice:
                "/assets/sounds/Scene20B_Alice_finish.wav",
            text:
                "Я, конечно, всё это время просто наблюдала, но тоже чувствую себя причастной!",
            duration: 8000
        },

        {
            name: "R2-D2",
            image:
                "/assets/characters/R3D3_portr_succes.png",
            voice:
                "/assets/sounds/Scene20C_R3D3.wav",
            text:
                "Бип-буп-бип-буп!» (перевод: «Я же говорил! Лучшие тестировщики галактики! Но мне бы ещё один регресс, а то, кажется вы сломали то, что работало»)",
            duration: 8000
        },
        {
            name: "Имперский офицер",
            image:
                "/assets/characters/office_hello.png",
            voice:
                "/assets/sounds/Scene20last_officer_finish.wav",
            text:
                "Что здесь произошло?! Вы... вы победили Вейдера? Ну... ладно. Признаю. Вы были правы. Баги были. Я... я перепишу отчёт.",
            duration: 16000
        }

    ],

    voting: {
        enabled: false
    },

    transition: {
        title: "Миссия выполнена!",
        text: "Поздравляем!"
    },

    choices: []

};