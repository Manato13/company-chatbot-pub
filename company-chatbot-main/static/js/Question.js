function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}
const global_userName = getCookie("username");
let global_selectItemPoint = 0;
let global_userPoint = 0;

let myUserName = global_userName
// let myUserIcon
console.log(global_userName)
async function fetchMyUserIcon() {
    document.getElementById("myUserName").textContent = myUserName
    await fetch("static/csv/userData.csv")
        .then(response => response.text())
        .then((data) => {
            let lines = data.split("\n");
            for (const row of lines) {
                // console.log(myUserName==row[0])
                // console.log(line)
                console.log(row.split(",")[0])
                if (myUserName == row.split(",")[0]) {
                    // ユーザアイコンを指定する
                    let userIconElement = document.querySelector(`#myUserIcon`)
                    userIconElement.src = row.split(",")[3]
                }
            }
        })
}
fetchMyUserIcon()




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
async function postQuestion(postQuestion) {
    await fetch('/post_question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `post_question=${postQuestion}`
    })
}
// 投稿ボタン
async function clickPostQuestion(object) {
    // 回答文を保存
    stringPostAnswer = document.querySelector(`#textareaBackground textarea`).value;
    // データベースに保存
    postQuestion(stringPostAnswer);
    document.querySelector(`#textareaBackground textarea`).value = "";
}
start();