"use strict";
module.exports = {
 id:"potion-negative-test",type:"potion_negative_test",
 title:"Негативное тестирование зелья",duration:30,points:30,
 question:"Документация: действие зелья длится ровно один час; через два часа возможна сонливость; запрещено смешивать зелье с алкоголем. Выберите два негативных сценария.",
 options:[
 {id:"thirty_minutes",label:"А. Проверить, действует ли удача через 30 минут"},
 {id:"two_hours_luck",label:"Б. Проверить, действует ли удача через 2 часа"},
 {id:"two_hours_sleep",label:"В. Проверить, появляется ли сонливость через 2 часа"},
 {id:"mix_alcohol",label:"Г. Проверить, что произойдёт при смешивании зелья с алкоголем"}
 ],
 correctIds:["two_hours_luck","mix_alcohol"]
};