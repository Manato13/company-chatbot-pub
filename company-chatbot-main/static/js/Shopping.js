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

// 商品一覧の表示
fetch('/static/csv/items.csv')
    .then(response => response.text())
    .then(data => {
        const rows = data.trim().split("\n");
        const products = rows.slice(1).map(row => {  // slice(1) to skip the header row
            const [Name, Image, Price, Description] = row.split(",");
            return {
                Name: Name.replace(/"/g, ""),
                Image: Image.replace(/"/g, ""),
                Price: Number(Price),
                Description: Description.replace(/"/g, "")
            };
        });

        products.forEach(product => {
            $("#Item-List").append(`
            <div class="item" data-item="${product.Name}" onclick="showPopup(this)">
                <img src="${product.Image}">
                <div class="item-info">
                    <div style="display: flex; align-items: center;">
                        <p class="item-name">${product.Name}</p>
                        <div class="point-marker" style="width: 22px; height: 22px; font-size: 17px; line-height: 25px; margin: 5px 10px 5px 0;">P</div>
                        <p style="font-weight: bold; font-size:19px;">${product.Price.toLocaleString()}</p>
                    </div>
                    <p>${product.Description}</p>
                </div>
            </div>
          `);
            //console.log(`商品名: ${product.Name}, 画像: ${product.Image}, 価格: ${product.Price}, 説明: ${product.Description}`);
        });
    })
    .catch(error => {
        console.error("Error reading the CSV file:", error);
    });

// 商品選択時の処理
function showPopup(data) {
    const item_name = $(data).data('item');
    fetch('/static/csv/items.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.trim().split("\n");
            const products = rows.slice(1).map(row => {
                const [Name, Image, Price, Description] = row.split(",");
                return {
                    Name: Name.replace(/"/g, ""),
                    Image: Image.replace(/"/g, ""),
                    Price: Number(Price),
                    Description: Description.replace(/"/g, "")
                };
            });
            const item_info = products.find(product => product.Name === item_name);
            $("#modal_info").empty();
            if (item_info) {
                global_selectItemPoint = item_info.Price;
                $("#modal_info").append(`
                    <div style="text-align: center; font-size: 30px; font-weight: bold; margin-top: 30px;">${item_info.Name}</div>
                    <div style="display: flex; justify-content: flex-end; padding-right: 40px;">
                        <div class="point-marker" style="width: 30px; height: 30px; font-size: 25px; line-height: 34px; margin: -3px 15px 5px 0;">
                            P
                        </div>
                        <p style="font-size: 20px; margin-top: 0px;">${item_info.Price.toLocaleString()}</p>
                    </div>
                    <img src="${item_info.Image}">
                    <div style="width: 80%; margin: auto">${item_info.Description}</div>
                `);
            } else {
                console.log("この商品名の商品は見つかりませんでした。");
            }
        })
        .catch(error => {
            console.error("Error reading the CSV file:", error);
        });
    $("#modal_background").css("display", "flex");
    document.getElementById("modal_window").className = "modal Fadein";
    
}

$("#back").on('click', function () {
    setTimeout(fade_out, 1200);
    document.getElementById("modal_window").className = "modal Fadeout";
});

function fade_out() {
    $("#modal_background").css("display", "none")
}

$("#buy").on('click', function () {
    $("#buy_background").css("display", "flex");
});

$("#buy_no").on('click', function () {
    $("#buy_background").css("display", "none");
});

// ポイントの引き算
function updatePointsForUser(userName, pointChange) {
    fetch('/update_user_points', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_name=${userName}&point_change=${pointChange}`
    })
        .then(response => response.text())
        .then(data => {
            if (data === "Updated successfully") {
                start();
                let popup = document.getElementById("purchaseCompletePopup");
                let initialPoints = global_userPoint;
                let finalPoints = global_userPoint - global_selectItemPoint;

                popup.style.display = "flex";  // ポップアップを表示
                animatePointsChange(initialPoints, finalPoints);  // アニメーション開始

                setTimeout(function () {
                    popup.style.display = "none";
                }, 4000);
            } else if (data === "Insufficient points") {
                let popup = document.getElementById("lowPointsPopup");
                popup.style.display = "flex";  // ポップアップを表示

                setTimeout(function () {   // 3秒後にポップアップを非表示にする
                    popup.style.display = "none";
                }, 2000);
            }
        })
        .catch(error => {
            console.error("Error updating the points:", error);
        });
}
function animatePointsChange(start, end) {
    let elem = document.getElementById("pointsChange");
    let current = start;
    let step = (end - start) / 50;  // 50フレームでアニメーション
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
$("#buy_yes").on('click', function () {
    updatePointsForUser(global_userName, global_selectItemPoint);
    $("#buy_background").css("display", "none");
});