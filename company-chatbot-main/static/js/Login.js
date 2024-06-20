document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    fetch("/login", {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData).toString()
    })
    .then(response => {
        if (response.url.endsWith("/home")) {
            window.location.href = "/home";  // リダイレクト先が /home である場合、ホームページに移動
            return;  // これ以降の処理をスキップ
        } else {
            return response.text();
        }
    })
    .then(data => {
        if (data === "Invalid credentials") {
            alert("認証情報が無効です");
        }
    })
    .catch(error => {
        console.error("Error during login:", error);
    });
});
