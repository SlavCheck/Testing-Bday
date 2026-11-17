"use strict";
module.exports = {
 id:"potion-negative-test",type:"potion_negative_test",
 title:"А что, если?..",duration:45,points:30,
 question:"Выбери два негативных теста для зелья удачи.",
 options:[
 {id:"follow_instructions",label:"Выпить зелье по инструкции"},
 {id:"unknown_ingredient",label:"Добавить в зелье неизвестный ингредиент"},
 {id:"check_color",label:"Проверить цвет готового зелья"},
 {id:"expired_potion",label:"Выпить зелье с истёкшим сроком годности"},
 {id:"check_aroma",label:"Проверить аромат зелья"},
 {id:"exact_recipe",label:"Приготовить зелье точно по рецепту"}
 ],
 correctIds:["unknown_ingredient","expired_potion"]
};