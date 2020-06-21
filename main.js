let selection = undefined;
let gameMap = [];
let correnctionCount = Infinity;
let points = 0;
let canMove = true;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function handleMove(first, second, byGame = false) {
    if (byGame) await sleep(500);
    if (!byGame) {
        console.log(first, second);
        document.getElementsByClassName(first)[0].style.border = "3px solid rgba(255, 255, 255, .4)";
        document.getElementsByClassName(second)[0].style.border = "3px solid rgba(255, 255, 255, .4)";
        selection = undefined;
        let xAbs = Math.abs(first.split("x")[0] - second.split("x")[0]);
        let yAbs = Math.abs(first.split("x")[1] - second.split("x")[1]);
        console.log(xAbs, yAbs);
        if (xAbs > 1 || yAbs > 1 || yAbs == xAbs) return;

        let tmp = gameMap[first.split("x")[0]][first.split("x")[1]];
        gameMap[first.split("x")[0]][first.split("x")[1]] = gameMap[second.split("x")[0]][second.split("x")[1]];
        gameMap[second.split("x")[0]][second.split("x")[1]] = tmp;
        await sleep(100);
    }
    let addMap = [];
    for (var x = 0; x < 10; x++) {
        addMap.push(0);
    }
    let checkMap = [];
    for (var y = 0; y < 10; y++) {
        let checkRow = [];
        for (var x = 0; x < 10; x++) {
            checkRow.push(false);
        }
        checkMap.push(checkRow);
    }
    let changeCount = 0;
    for (var y = 0; y < 10; y++) {
        for (var x = 0; x < 10; x++) {
            if (checkMap[x][y]) continue;
            if (gameMap[x][y] == "e") continue;
            let checkSweets = [];
            let sweetsCount = 1;
            let currentSweetName = gameMap[x][y];
            let sweetsToChange = [
                [x, y]
            ];
            checkSweets.push([x, y]);
            console.log("Checking: ", x, y);
            while (checkSweets.length > 0) {
                let sweet = checkSweets.pop();
                checkMap[sweet[0]][sweet[1]] = true;
                if (gameMap[sweet[0] - 1] != undefined)
                    if (gameMap[sweet[0] - 1][sweet[1]] == currentSweetName) {
                        if (!checkMap[sweet[0] - 1][sweet[1]]) {
                            checkSweets.push([sweet[0] - 1, sweet[1]]);
                            sweetsToChange.push([sweet[0] - 1, sweet[1]]);
                            sweetsCount++;
                        }
                    }
                if (gameMap[sweet[0] + 1] != undefined)
                    if (gameMap[sweet[0] + 1][sweet[1]] == currentSweetName) {
                        if (!checkMap[sweet[0] + 1][sweet[1]]) {
                            checkSweets.push([sweet[0] + 1, sweet[1]]);
                            sweetsToChange.push([sweet[0] + 1, sweet[1]]);
                            sweetsCount++;
                        }
                    }
                if (gameMap[sweet[0]][sweet[1] - 1] != undefined)
                    if (gameMap[sweet[0]][sweet[1] - 1] == currentSweetName) {
                        if (!checkMap[sweet[0]][sweet[1] - 1]) {
                            checkSweets.push([sweet[0], sweet[1] - 1]);
                            sweetsToChange.push([sweet[0], sweet[1] - 1]);
                            sweetsCount++;
                        }
                    }
                if (gameMap[sweet[0]][sweet[1] + 1] != undefined)
                    if (gameMap[sweet[0]][sweet[1] + 1] == currentSweetName) {
                        if (!checkMap[sweet[0]][sweet[1] + 1]) {
                            checkSweets.push([sweet[0], sweet[1] + 1]);
                            sweetsToChange.push([sweet[0], sweet[1] + 1]);
                            sweetsCount++;
                        }
                    }
            }
            console.log(sweetsCount);
            if (sweetsCount >= 3) {
                console.log("Adding points...");
                points += sweetsCount;
                document.getElementById("points").innerHTML = points;
                if (byGame) await sleep(100);
                changeCount++;
                await updateDisplay();
                for (sweetToChange of sweetsToChange) {
                    addMap[sweetToChange[0]]++;
                    await updateDisplay();
                    gameMap[sweetToChange[0]][sweetToChange[1]] = "e";
                    await sleep(100);
                    await updateDisplay();
                }



                await handleMove(undefined, undefined, true);

            }
            for (var y = 9; y >= 0; y--) {
                for (var x = 0; x < 10; x++) {
                    if (y == 0 && addMap[x] > 0) {
                        await sleep(50);
                        let sweetID = parseInt(Math.random() * 6);
                        let sweetName = undefined;
                        addMap[x]--;
                        switch (sweetID) {
                            case 0:
                                sweetName = "p";
                                break;
                            case 1:
                                sweetName = "o";
                                break;
                            case 2:
                                sweetName = "b";
                                break;
                            case 3:
                                sweetName = "r";
                                break;
                            case 4:
                                sweetName = "g";
                                break;
                            case 5:
                                sweetName = "y";
                                break;
                        }
                        gameMap[x][0] = sweetName;
                        await updateDisplay();
                        await handleMove(undefined, undefined, true);



                    }
                    if (gameMap[x][y] != "e")

                        while (gameMap[x][y + 1] != undefined && gameMap[x][y + 1] == "e") {

                            await sleep(50);
                            await updateDisplay();
                            var tmp = gameMap[x][y + 1];
                            gameMap[x][y + 1] = gameMap[x][y];
                            gameMap[x][y] = tmp;
                            await sleep(50);
                            await updateDisplay();


                        }

                }

            }


        }

    }

    await updateDisplay();
    if (!byGame) {
        await sleep(200);
        if (changeCount == 0) {
            tmp = gameMap[first.split("x")[0]][first.split("x")[1]];
            gameMap[first.split("x")[0]][first.split("x")[1]] = gameMap[second.split("x")[0]][second.split("x")[1]];
            gameMap[second.split("x")[0]][second.split("x")[1]] = tmp;
        }
    }
    await updateDisplay();
    console.log("Done");
}

async function handleInput() {

    if (!canMove) return;
    canMove = false;
    console.log("Sel: " + selection);
    console.log(this.dataset.id);
    if (this.dataset.id == selection) {
        document.getElementsByClassName(this.dataset.id)[0].style.border = "3px solid rgba(255, 255, 255, .4)";
        selection = undefined;
    } else if (selection != undefined && selection != this.dataset.id) {
        document.getElementsByClassName(this.dataset.id)[0].style.border = "3px solid rgba(255, 0, 0, .8)";
        await handleMove(selection, this.dataset.id);
    } else {
        selection = this.dataset.id;
        document.getElementsByClassName(this.dataset.id)[0].style.border = "3px solid rgba(255, 0, 0, .8)";
    }
    canMove = true;
}
document.addEventListener("DOMContentLoaded", function () {
    let cellsContainer = document.getElementById("cells");
    cellsContainer.innerHTML = "";
    for (var y = 0; y < 10; y++) {
        let row = [];
        for (var x = 0; x < 10; x++) {
            cellsContainer.innerHTML += "<div class=\"cell " + x + "x" + y + "\" data-id=" + x + "x" + y + "></div>";
            row.push("e");
        }
        gameMap.push(row);
    }
    console.log(gameMap);
    for (var y = 0; y < 10; y++) {
        for (var x = 0; x < 10; x++) {
            let changeCell = true;
            while (changeCell) {
                let sweetID = parseInt(Math.random() * 6);
                let sweetName = undefined;
                switch (sweetID) {
                    case 0:
                        sweetName = "p";
                        break;
                    case 1:
                        sweetName = "o";
                        break;
                    case 2:
                        sweetName = "b";
                        break;
                    case 3:
                        sweetName = "r";
                        break;
                    case 4:
                        sweetName = "g";
                        break;
                    case 5:
                        sweetName = "y";
                        break;
                }
                let change = false;
                let neighboursCount = 0;
                if (gameMap[x - 1] != undefined && gameMap[x - 2] != undefined) {
                    if (gameMap[x - 1][y] == sweetName && gameMap[x - 2][y] == sweetName) change = true;
                }
                if (gameMap[x + 1] != undefined && gameMap[x + 2] != undefined) {
                    if (gameMap[x + 1][y] == sweetName && gameMap[x + 2][y] == sweetName) change = true;
                }
                if (gameMap[x][y + 1] != undefined && gameMap[x][y + 2] != undefined) {
                    if (gameMap[x][y + 1] == sweetName && gameMap[x][y + 2] == sweetName) change = true;
                }
                if (gameMap[x][y - 1] != undefined && gameMap[x][y - 2] != undefined) {
                    if (gameMap[x][y - 1] == sweetName && gameMap[x][y - 2] == sweetName) change = true;
                }
                if (gameMap[x + 1] != undefined) {
                    if (gameMap[x + 1][y] == sweetName) {
                        neighboursCount++;
                        if (gameMap[x + 1][y - 1] != undefined)
                            if (gameMap[x + 1][y - 1] == sweetName) change = true;
                        if (gameMap[x + 1][y + 1] != undefined)
                            if (gameMap[x + 1][y + 1] == sweetName) change = true;
                    }
                }
                if (gameMap[x - 1] != undefined) {
                    if (gameMap[x - 1][y] == sweetName) {
                        neighboursCount++;
                        if (gameMap[x - 1][y - 1] != undefined)
                            if (gameMap[x - 1][y - 1] == sweetName) change = true;
                        if (gameMap[x - 1][y + 1] != undefined)
                            if (gameMap[x - 1][y + 1] == sweetName) change = true;
                    }
                }
                if (gameMap[x][y - 1] != undefined) {
                    if (gameMap[x][y - 1] == sweetName) {
                        neighboursCount++;
                        if (gameMap[x + 1] != undefined)
                            if (gameMap[x + 1][y - 1] == sweetName) change = true;
                        if (gameMap[x - 1] != undefined)
                            if (gameMap[x - 1][y - 1] == sweetName) change = true;
                    }
                }
                if (gameMap[x][y + 1] != undefined) {
                    if (gameMap[x][y + 1] == sweetName) {
                        neighboursCount++;
                        if (gameMap[x + 1] != undefined)
                            if (gameMap[x + 1][y + 1] == sweetName) change = true;
                        if (gameMap[x - 1] != undefined)
                            if (gameMap[x - 1][y + 1] == sweetName) change = true;
                    }
                }
                if (neighboursCount >= 2) change = true;
                if (!change) {
                    gameMap[x][y] = sweetName;
                    changeCell = false;
                } else console.log("Changing (" + x + "," + y + ") from " + sweetName);
            }
        }
    }
    let cells = document.getElementsByClassName("cell");
    for (cell of cells) {
        cell.onclick = handleInput;
    }
    updateDisplay();
});
async function updateDisplay() {
    let urlStart = "url(\"assets/";
    let urlEnd = ".png\")";
    for (var y = 0; y < 10; y++) {
        for (var x = 0; x < 10; x++) {
            let cell = document.getElementsByClassName(x + "x" + y)[0];
            switch (gameMap[x][y]) {
                case "p":
                    cell.style.backgroundImage = urlStart + "pink" + urlEnd;
                    break;
                case "o":
                    cell.style.backgroundImage = urlStart + "orange" + urlEnd;
                    break;
                case "b":
                    cell.style.backgroundImage = urlStart + "blue" + urlEnd;
                    break;
                case "r":
                    cell.style.backgroundImage = urlStart + "red" + urlEnd;
                    break;
                case "g":
                    cell.style.backgroundImage = urlStart + "green" + urlEnd;
                    break;
                case "y":
                    cell.style.backgroundImage = urlStart + "yellow" + urlEnd;
                    break;
                case "e":
                    cell.style.backgroundImage = "none";
                    break;
            }
        }
    }
}