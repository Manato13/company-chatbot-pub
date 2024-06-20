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


let csvQList = []

async function fetchDataQ() {
    const response = await fetch("static/csv/BBS.csv");
    const data = await response.text();
    let lines = data.split("\n").filter(line => line.trim() !== ""); // 空行を省く
    for (let i = 1; i < lines.length; ++i) {
        csvQList.push(lines[i].split(","))
    }
}

async function displayAllUniqueQuestions() {
    await fetchDataQ();

    let displayedQuestions = {}; // すでに表示した質問IDのトラッキング用
    let answerCounts = {};
    let resolutionStatus = {};

    // 全ての質問に対する回答の数と、解決ステータスを集計する
    for (const element of csvQList) {
        let questionId = element[1];

        if (!answerCounts[questionId]) {
            answerCounts[questionId] = 0;
            resolutionStatus[questionId] = "False";
        }

        answerCounts[questionId]++;

        if (element[6] == "True") {
            resolutionStatus[questionId] = "True";
        }
    }

    for (const element of csvQList) {
        let questionId = element[1];
        console.log(element)
        // すでに表示した質問はスキップ
        if (displayedQuestions[questionId]) {
            continue;
        }

        let question_sentence = element[2];
        let resolve = (resolutionStatus[questionId] == "True") ? "解決" : "未解決";
        let resolve_color = (resolutionStatus[questionId] == "True") ? "rgb(19, 161, 0)" : "rgb(146, 0, 0)";

        let answerCount = answerCounts[questionId];

        $("#question_List").append(`
            <div class="oneQuestion">
                <div class="questionInfo">
                    <header style="color: ${resolve_color};">${resolve}</header>
                    <div>${question_sentence}</div>
                </div>
                <div class="numComment">
                    <div>
                        <img src="/static/img/message-circle.svg" alt="num-commnet" class="icon">
                    </div>
                    <p>
                        <span>${answerCount}</span>
                    </p>
                </div>
                <time class="updateTime" style="font-size:1.0rem;">
                    ${element[7]}
                </time>
                <a href="/answer?questionId=${questionId}"></a>
            </div>
        `);

        displayedQuestions[questionId] = true; // この質問を表示済みとしてマーク
    }
}

displayAllUniqueQuestions(); // すべてのユニークな質問を表示






// dataをcsvファイルから取得して、htmlに表示
/*async function displayData() {
    await fetchDataQ();
    let questionElementFlag = False;
    for (const element of csvQList) {
        // 質問文をhtmlに表示
        // 質問文に対する回答のリストを取得
        if (element[1] == numdSelectedQ) {
            if (questionElementFlag == False) {
                let questionSentence = document.querySelector('#questionInfo div');
                questionSentence.textContent = element[2];
            }
            selectedAnswersDataList.push(element)
        }
    }
    // 適切なセレクタで回答数を選択
    document.querySelector('#numComment span').textContent = String(selectedAnswersDataList.length);

    if (selectedAnswersDataList[0][6] == "True") {
        // 適切なセレクタで「解決」または「未解決」を選択
        document.querySelector('#questionInfo header').textContent = "解決";
        document.querySelector('#questionInfo header').style.color = "rgb(19, 161, 0)";
    } else if (selectedAnswersDataList[0][6] == "False") {
        document.querySelector('#questionInfo header').textContent = "未解決";
        document.querySelector('#questionInfo header').style.color = "rgb(146, 0, 0)";
    }
}*/