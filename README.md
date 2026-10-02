# 中國象棋 Xiangqi Online

純前端中國象棋網頁遊戲，支援：

- **本地雙人**（同一裝置輪流下）
- **人機對戰**（簡易 AI）
- **線上對戰**（建立房間 → 分享代碼 → 對方輸入代碼即可連線）
- 響應式設計，電腦 / 手機 / 平板皆可操作
- 完整象棋規則（將帥、士象、馬腿、炮架、兵卒過河等）由 [xiangqi.js](https://github.com/lengyanyu258/xiangqi.js) 負責

線上對戰使用 **PeerJS**（WebRTC 點對點），無需自己架設後端，可直接部署到 **GitHub Pages**。

## 線上試玩

上傳到 GitHub 並開啟 Pages 後，網址即為遊戲連結。

## 如何部署到 GitHub Pages

1. 到 GitHub 新建一個 Repository（建議公開）
2. 把本專案所有檔案上傳（或 `git push`）
3. 進入 Repo → **Settings** → **Pages**
4. Source 選擇 `Deploy from a branch`，Branch 選 `main`（或 `master`），資料夾選 `/ (root)`
5. 等待一兩分鐘，會得到類似 `https://你的帳號.github.io/倉庫名/` 的網址
6. 用這個網址就能玩，也能分享給朋友

## 本地測試

直接用瀏覽器打開 `index.html` 即可（建議用 Chrome / Edge / Firefox）。

若遇到 CORS 或模組問題，可用簡單靜態伺服器：

```bash
npx serve .
# 或
python -m http.server 8080
```

## 操作說明

### 單機
- **本地雙人**：兩人輪流在同一畫面下棋
- **人機對戰**：你執紅，電腦執黑

### 線上對戰
1. 一方點「建立房間」，會產生一組房間代碼（例如 `K7M2P`）
2. 把代碼分享給朋友（可點「複製」）
3. 另一方點「加入房間」，輸入代碼後連線
4. 主機執紅（先手），加入者執黑（畫面會自動翻轉方便操作）

### 通用
- 點選己方棋子 → 再點目標位置（綠色圓點為可走位置）
- 支援觸控與滑鼠
- 悔棋（線上模式暫不支援）
- 認輸 / 重新開始

## 專案結構

```
xiangqi-game/
├── index.html          # 主頁面
├── css/style.css       # 樣式（響應式）
├── js/
│   ├── board.js        # Canvas 棋盤繪製與互動
│   ├── ai.js           # 簡易人機 AI
│   ├── multiplayer.js  # PeerJS 連線邏輯
│   └── app.js          # 主流程
├── lib/
│   ├── xiangqi.js      # 象棋規則引擎
│   └── peerjs.min.js   # PeerJS 函式庫
└── README.md
```

## 注意事項

- 線上對戰依賴 PeerJS 公共伺服器與 STUN，在嚴格防火牆 / 某些公司網路下可能連線失敗，可多試幾次或換網路。
- AI 目前深度較淺（約 2 層），僅供休閒娛樂，非職業強度。
- 本專案僅供學習與娛樂，棋規以 xiangqi.js 實作為準。

## 授權

- 本專案程式碼可自由使用與修改
- xiangqi.js：BSD-2-Clause
- PeerJS：MIT

祝下棋愉快！
