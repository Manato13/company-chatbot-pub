function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}
const global_userName = getCookie("username");
let numChatbot = Number(getCookie("num_use_chatbot"));
console.log(numChatbot);
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


function submitWithAtSign() {
    let textarea = document.querySelector("[name='user_input']");
    if (textarea.value.trim() === "") {
        let popup = document.getElementById("textInputPopup");
        popup.style.display = "block"; // ポップアップを表示

        setTimeout(function () { // 3秒後にポップアップを非表示にする
            popup.style.display = "none";
        }, 1500);


        return;
    }
    if (!textarea.value.startsWith("@")) {
        textarea.value = "@" + textarea.value;
    }
    if ((numChatbot + 1) % 5 == 0) {
        console.log("ok");
        upPointsOfAnswer(global_userName, 10);
    } else {
        document.getElementById("loadingPopup").style.display = "block";
    }
    document.getElementById("chatForm").submit();
}

function submitWithoutAtSign() {
    let textarea = document.querySelector("[name='user_input']");
    if (textarea.value.trim() === "") {
        let popup = document.getElementById("textInputPopup");
        popup.style.display = "block"; // ポップアップを表示
        setTimeout(function () { // 3秒後にポップアップを非表示にする
            popup.style.display = "none";
        }, 1500);

        return;
    }
    if ((numChatbot + 1) % 5 == 0) {
        console.log("ok");
        upPointsOfAnswer(global_userName, 10);
    } else {
        document.getElementById("loadingPopup").style.display = "block";
    }
    document.getElementById("chatForm").submit();
}

function typeWriterEffect(element, text, interval = 50) {
    let i = 0;

    function typeNextChar() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(typeNextChar, interval);
        }
    }
    typeNextChar();
}

window.onload = function () {
    document
        .getElementById("loadingPopup")
        .style
        .display = "none";
    let lastBotMessageElement = document.getElementById("lastBotMessage");
    let chatBody = document.querySelector(".chat-body");
    let typeEffect = chatBody.getAttribute("data-type-effect") === "true";
    scrollToBottom();
    if (lastBotMessageElement && typeEffect) {
        let fullText = lastBotMessageElement.textContent;
        lastBotMessageElement.textContent = "";
        typeWriterEffect(lastBotMessageElement, fullText);
    }
};

function scrollToBottom() {
    let container = document.querySelector('.chat-container');
    container.scrollTop = container.scrollHeight;
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
                let finalPoints = global_userPoint + 10;

                popup.style.display = "flex";  // ポップアップを表示
                animatePointsChange(initialPoints, finalPoints);  // アニメーション開始

                setTimeout(function () {
                    popup.style.display = "none";
                    window.location.reload();
                }, 4000);
            } else if (data === "Insufficient points") { }
        })
        .catch(error => {
            console.error("Error updating the points:", error);
        });
}
// 足し算の可視化
function animatePointsChange(start, end) {
    let elem = document.getElementById("pointsChange");
    let current = start;
    let step = (end - start) / 10;  // 50フレームでアニメーション
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