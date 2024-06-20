function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}
const global_userName = getCookie("username");
let global_selectItemPoint = 0;
let global_userPoint = 0;

// ポイントを表示する処理
function start() {
    $("#point_name").html(global_userName + "さんのポイント");
    fetch('/static/csv/userdata.csv')
        .then(response => response.text())
        .then(data => {
            let lines = data.split('\n');
            for (let line of lines) {
                let parts = line.split(',');
                if (parts[0] === global_userName) {
                    $("#you_point").html(Number(parts[2]).toLocaleString());
                    global_userPoint = Number(parts[2]);
                    return;
                }
            }
            console.log("User not found");
        })
        .catch(error => {
            console.error("Error reading the CSV file:", error);
        });
}
start();


// 選択した
let urlParams = new URLSearchParams(window.location.search);
let numdSelectedQuestion = urlParams.get('questionId');
let csvQAList = []
let userDataList = []
// 選択した質問に対する回答のデータのリスト
let selectedAnswersDataList = []

async function fetchDataQA() {
    await fetch("static/csv/BBS.csv")
        .then(response => response.text())
        .then((data) => {
            csvQAList = []
            let lines = data.split("\n");
            for (let i = 1; i < lines.length; ++i) {
                csvQAList.push(lines[i].split(","))
            }
        })
    return
}

async function fetchUserData() {
    await fetch("static/csv/userdata.csv")
        .then(response => response.text())
        .then((data) => {
            userDataList = []
            let lines = data.split("\n");
            for (let i = 1; i < lines.length; ++i) {
                userDataList.push(lines[i].split(","))
            }
        }
        )
}
// dataをcsvファイルから取得して、htmlに表示
async function displayData() {
    await fetchDataQA();
    await fetchUserData();
    let questionElementFlag = false;
    for (const elemnet of csvQAList) {
        // 質問文をhtmlに表示
        // 質問文に対する回答のリストを取得
        if (elemnet[1] == numdSelectedQuestion) {
            if (questionElementFlag == false) {
                document.getElementById('updateTime').textContent=elemnet[7];
                let questionSentence = document.getElementById('questionSentence');
                questionSentence.textContent = elemnet[2];
            }
            selectedAnswersDataList.push(elemnet)
        }
    }
    // 回答数を表示
    document.querySelector(`#numAnswers span`).textContent = String(selectedAnswersDataList.length);
    let answerListElement = document.getElementById("answerList");
    for (const data of selectedAnswersDataList) {
        if (data[6] == "True") {
            document.getElementById("boolSolvedAnswer").textContent = "解決"
            document.getElementById("boolSolvedAnswerFrame").style.backgroundColor = "rgb(196, 255, 209)"
            document.getElementById("boolSolvedAnswer").style.color = "rgb(19, 161, 0)"
            break;
        } else {
            document.getElementById("boolSolvedAnswer").textContent = "未解決"
            document.getElementById("boolSolvedAnswerFrame").style.backgroundColor = "rgb(255, 194, 194)"
            document.getElementById("boolSolvedAnswer").style.color = "rgb(146, 0, 0)"
        }        
    }
    console.log(selectedAnswersDataList)

    // for文で回答者の数だけhtmlに表示
    for (let i = 0; i < selectedAnswersDataList.length; ++i) {
        // 回答要素のテンプレートをクローン
        let content_area = document.getElementById("templateAnswer");
        let clone_element = content_area.cloneNode(true);
        answerListElement.appendChild(clone_element);
        clone_element.id = `answer${selectedAnswersDataList[i][0]}`;
        // clone_element.style.display = "flex";
        let userIconElement = document.querySelector(`#answer${selectedAnswersDataList[i][0]} img`)
        document.querySelector(`#answer${selectedAnswersDataList[i][0]} .userName`).textContent = selectedAnswersDataList[i][3];
        //ユーザの情報を取得
        for (const userData of userDataList) {
            if (selectedAnswersDataList[i][3] == userData[0]) {
                userIconElement.src = userData[3];
                break;
            }
        }
        // 回答文の表示
        document.querySelector(`#answer${selectedAnswersDataList[i][0]} #answerSentence`).textContent = selectedAnswersDataList[i][4];
        // いいね数の表示
        document.querySelector(`#answer${selectedAnswersDataList[i][0]} #numGoodPoint`).textContent = selectedAnswersDataList[i][5];
    }
    // 自分の回答要素を表示
    // 自分のデータを取得
    for (const userData of userDataList) {
        if (global_userName == userData[0]) {
            let myUserName = global_userName;
            document.querySelector(`#myUserName`).textContent = myUserName;
            document.querySelector(`#myAnswer img`).src = userData[3];
            // 1つの質問に対するすべての回答に対してログインしているユーザの情報を取得
            for (const answerData of selectedAnswersDataList) {
                // いいねボタンに関して
                if (userData[4].split("\\").includes((answerData[0]))) {
                    document.querySelector(`#answer${answerData[0]} #goodIcon img`).src = "static/img/good_icon_black.png"
                } else {
                    document.querySelector(`#answer${answerData[0]} #goodIcon img`).src = "static/img/good_icon_white.png"
                }
                // これで解決ボタンに関して
                if (userData[5].split("\\").includes((answerData[0]))) {
                    document.querySelector(`#answer${answerData[0]} #solvedAnswerIcon img`).src = "static/img/solvedAnswerClicked.png"
                    document.querySelector(`#answer${answerData[0]} #stringSolvedAnswer`).textContent = "解決済みを解除";
                } else {
                    document.querySelector(`#answer${answerData[0]} #solvedAnswerIcon img`).src = "static/img/solvedAnswer.svg"
                    document.querySelector(`#answer${answerData[0]} #stringSolvedAnswer`).textContent = "これで解決！";
                }
            }
            break;
        }
    }
}


// いいねポイント
function updateGoodPointForUser(userName, pointChange, questionAnswerId) {
    fetch('/update_good_point', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_name=${userName}&point_change=${pointChange}&question_answer_id=${questionAnswerId}`
    })
}
async function clickGoodButton(object) {
    await fetchUserData()
    // 掲示板から選択した質問に対する回答の番号(0~)を取得
    await fetchDataQA()
    let myUserName = global_userName
    // numQAを取得
    numClickedAnswer = Number(object.parentNode.parentNode.id.split("answer")[1]);
    console.log(csvQAList[numClickedAnswer][5])
    // 回答者のいいねの数を変更(mahou_shou_qa.csvの中のいいね数を変更)
    for (const userData of userDataList) {
        if (userData[0] == global_userName) {
            // ユーザが過去に押したansweridを取得
            // もし過去にこの回答に対してユーザが押されていたら
            console.log(selectedAnswersDataList)            
            if (userData[4].split("\\").includes(String(numClickedAnswer))) {
                console.log("goodボタンが解除された")
                document.querySelector(`#answer${numClickedAnswer} #numGoodPoint`).textContent = String(Number(csvQAList[numClickedAnswer][5]) - 1);
                document.querySelector(`#answer${numClickedAnswer} #goodIcon img`).src = "static/img/good_icon_white.png"
                updateGoodPointForUser(myUserName, -1, numClickedAnswer);
            } else {
                console.log("goodボタンが押された");
                document.querySelector(`#answer${numClickedAnswer} #numGoodPoint`).textContent = String(Number(csvQAList[numClickedAnswer][5]) + 1);
                document.querySelector(`#answer${numClickedAnswer} #goodIcon img`).src = "static/img/good_icon_black.png"
                updateGoodPointForUser(myUserName, 1, numClickedAnswer);
            }
            break;
        }
    }
}
// 選択した質問が解決しているかどうか
function checkSolvedQuestion() {
    
}
// いいねポイント
function updateSolvedAnswer(userName, pointChange, questionAnswerId) {
    fetch('/update_solved_answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_name=${userName}&point_change=${pointChange}&question_answer_id=${questionAnswerId}`
    })
}
async function clickSolvedAnswerButton(object) {
    await fetchUserData()
    // 掲示板から選択した質問に対する回答の番号(0~)を取得
    await fetchDataQA()
    let myUserName = global_userName
    // numQAを取得
    numClickedAnswer = Number(object.parentNode.parentNode.id.split("answer")[1]);
    // 回答者のいいねの数を変更(mahou_shou_qa.csvの中のいいね数を変更)
    for (const userData of userDataList) {
        if (userData[0] == global_userName) {
            // ユーザが過去に押したansweridを取得
            // console.log(userData[4].split("\\"))
            // もし過去にこの回答に対してユーザが押されていたら            
            if (userData[5].split("\\").includes(String(numClickedAnswer))) {
                console.log("解決ボタンが解除された")
                document.querySelector(`#answer${numClickedAnswer} #stringSolvedAnswer`).textContent = "これで解決！";
                document.querySelector(`#answer${numClickedAnswer} #solvedAnswerIcon img`).src = "static/img/solvedAnswer.svg"
                for (let i = 0; i < selectedAnswersDataList.length; ++i) {
                    if (selectedAnswersDataList[i][0] == numClickedAnswer) {
                        selectedAnswersDataList[i][6] = "Flase";
                        break;
                    }
                }
                updateSolvedAnswer(myUserName, -1, numClickedAnswer);
            } else {
                console.log("解決ボタンが押された");
                document.querySelector(`#answer${numClickedAnswer} #stringSolvedAnswer`).textContent = "解決済みを解除";
                document.querySelector(`#answer${numClickedAnswer} #solvedAnswerIcon img`).src = "static/img/solvedAnswerClicked.png"
                for (let i = 0; i < selectedAnswersDataList.length; ++i) {
                    if (selectedAnswersDataList[i][0] == numClickedAnswer) {
                        selectedAnswersDataList[i][6] = "True";
                        break;
                    }
                }
                updateSolvedAnswer(myUserName, 1, numClickedAnswer);
            }
            for (const data of selectedAnswersDataList) {
                if (data[6] == "True") {
                    document.getElementById("boolSolvedAnswer").textContent = "解決"
                    document.getElementById("boolSolvedAnswerFrame").style.backgroundColor = "rgb(196, 255, 209)"
                    document.getElementById("boolSolvedAnswer").style.color = "rgb(19, 161, 0)"
                    break;
                } else {
                    document.getElementById("boolSolvedAnswer").textContent = "未解決"
                    document.getElementById("boolSolvedAnswerFrame").style.backgroundColor = "rgb(255, 194, 194)"
                    document.getElementById("boolSolvedAnswer").style.color = "rgb(146, 0, 0)"
                }
            }

            break;
        }
    }
}

async function addAnswer(answerPosted,selectedQuestionId,answerUserName) {
    await fetch('/add_answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `answer_posted=${answerPosted}&selected_question_id=${selectedQuestionId}&answer_user_name=${answerUserName}`
    })
}

// 投稿ボタン
async function clickPostAnswer(object) {
    // 最新のデータを引っ張ってくる
    await fetchUserData();
    await fetchDataQA();
    // 回答文を保存
    stringPostAnswer = document.querySelector(`#textareaBackground textarea`).value;
    console.log(stringPostAnswer);
    // 回答文を追加
    document.querySelector(`#textareaBackground textarea`).value = "";
    // データベースに保存
    addAnswer(stringPostAnswer,numdSelectedQuestion,global_userName);
    console.log(global_userName);

    upPointsOfAnswer(global_userName, 30);

    //window.location.reload();
}
// ポイント足し算
function upPointsOfAnswer(userName, pointChange) {
    start();
    fetch('/update_answer_points', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_name=${userName}&point_change=${pointChange}`
    })
        .then(response => response.text())
        .then(data => {
            if (data === "Updated successfully") {
                let popup = document.getElementById("purchaseCompletePopup");
                let initialPoints = global_userPoint
                let finalPoints = global_userPoint + 30;

                popup.style.display = "flex";  // ポップアップを表示
                animatePointsChange(initialPoints, finalPoints);  // アニメーション開始

                setTimeout(function () {
                    popup.style.display = "none";
                    window.location.reload();
                }, 4000);
            } else if (data === "Insufficient points") {}
        })
        .catch(error => {
            console.error("Error updating the points:", error);
        });
}
// 足し算の可視化
function animatePointsChange(start, end) {
    let elem = document.getElementById("pointsChange");
    let current = start;
    let step = (end - start) / 30;  // 50フレームでアニメーション
    let id = setInterval(frame, 30);  // 30msごとに更新

    function frame() {
        if (current === end) {
            clearInterval(id);
        } else {
            current += step;
            elem.innerHTML = `
                <div class="point-marker" 
                    style="width: 28px; height: 28px; display: inline-block; line-height: 28px; font-size: 25px; vertical-align: middle;">
                    P
                </div>
                <div style="margin-left: 20px; font-size: 23px;"> ${Math.round(current).toLocaleString()}</div>`;
        }
    }
}

displayData();