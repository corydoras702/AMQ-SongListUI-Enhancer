// ==UserScript==
// @name         AMQ Song List UI Enhancer
// @namespace    https://github.com/corydoras702
// @version      1.0
// @description  Addon for AMQ Song List UI addon - adds libraryMaster download and enhanced JSON export
// @author       corydoras702
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// @require      https://github.com/amq-script-project/AMQ-Scripts/raw/master/gameplay/amqAnswerTimesUtility.user.js
// @require      https://github.com/TheJoseph98/AMQ-Scripts/raw/master/amqSongListUI.user.js
// ==/UserScript==

// Wait until the main script is loaded and setup
if (typeof Listener === "undefined") return;

let addonLoadInterval = setInterval(() => {
    if ($("#loadingScreen").hasClass("hidden") && typeof exportData !== "undefined") {
        clearInterval(addonLoadInterval);
        setupAddon();
    }
}, 1000);

let libraryButton;
let pendingEnhancements = new Map();

function setupAddon() {
    console.log("AMQ Song List UI Addon loading...");
    
    // Library Master Download機能を追加
    addLibraryMasterDownload();
    
    // JSON Export機能を拡張
    enhanceJSONExport();
    
    // 追加のsongデータを収集するリスナーを追加
    addEnhancedDataListener();
    
    console.log("AMQ Song List UI Addon loaded successfully!");
}

// Library Master Download機能
function addLibraryMasterDownload() {
    let librarybuttonListener = new Listener("get current master list id", (data) => {
        setTimeout(() => {
            let masterList = {
                masterID: data.masterListId,
                url: "https://animemusicquiz.com/libraryMasterList?masterId=" + data.masterListId
            };
            createLibraryButton(masterList);
        }, 0);
    });
    
    librarybuttonListener.bindListener();
}

function createLibraryButton(masterList) {
    // 既存のボタンがあれば削除
    if (libraryButton) {
        libraryButton.remove();
    }
    
    libraryButton = $(`<div id="addonLibraryButton" class="topRightBackButton leftRightButtonTop clickAble"><div>Library Data</div></div>`)
        .click(function () {
            // libraryMasterListを直接ダウンロード
            const link = document.createElement("a");
            link.href = masterList.url;
            link.download = "libraryMasterList.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .popover({
            placement: "bottom",
            content: "Download Library Master List",
            trigger: "hover"
        });

    // elExpandButtonの右側にボタンを追加
    $("#elExpandButtonContainer").append(libraryButton);
}

// 追加のsongデータを収集
function addEnhancedDataListener() {
    let enhancedAnswerResultsListener = new Listener("answer results", (result) => {
        // イベント固有IDを生成（タイムスタンプ + ランダム値）
        let eventId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        
        // 拡張データを一時保存
        pendingEnhancements.set(eventId, {
            typeNumber: result.songInfo.typeNumber,
            altAnimeNames: result.songInfo.altAnimeNames,
            altAnimeNamesAnswers: result.songInfo.altAnimeNamesAnswers,
            artistInfo: result.songInfo.artistInfo,
            composerInfo: result.songInfo.composerInfo,
            arrangerInfo: result.songInfo.arrangerInfo,
            typeRaw: result.songInfo.type,
            difficultyRaw: result.songInfo.animeDifficulty,
            // 楽曲識別用データ
            songIdentifier: {
                name: result.songInfo.songName,
                artist: result.songInfo.artist,
                annId: result.songInfo.annId
            }
        });
        
        setTimeout(() => {
            applyPendingEnhancements(eventId);
        }, 100);
        
        // 5秒後に未処理のデータをクリーンアップ
        setTimeout(() => {
            pendingEnhancements.delete(eventId);
        }, 5000);
    });
    
    enhancedAnswerResultsListener.bindListener();
}

// 保留中の拡張データを適用
function applyPendingEnhancements(eventId) {
    if (!pendingEnhancements.has(eventId)) return;
    
    let enhancedData = pendingEnhancements.get(eventId);
    let songId = enhancedData.songIdentifier;
    
    // exportDataから一致する楽曲を逆順検索（最新から）
    for (let i = exportData.length - 1; i >= 0; i--) {
        let song = exportData[i];
        
        // 楽曲の一致確認
        if (song.name === songId.name && 
            song.artist === songId.artist && 
            song.annId === songId.annId && 
            !song._enhanced) {
            
            // 拡張データを適用
            song.typeNumber = enhancedData.typeNumber;
            song.altAnimeNames = enhancedData.altAnimeNames;
            song.altAnimeNamesAnswers = enhancedData.altAnimeNamesAnswers;
            song.artistInfo = enhancedData.artistInfo;
            song.composerInfo = enhancedData.composerInfo;
            song.arrangerInfo = enhancedData.arrangerInfo;
            song.typeRaw = enhancedData.typeRaw;
            song.difficultyRaw = enhancedData.difficultyRaw;
            song._enhanced = true; // 処理済みマーク
            
            pendingEnhancements.delete(eventId);
            return;
        }
    }
    
    // 一致する楽曲が見つからない場合は後で再試行
    setTimeout(() => {
        applyPendingEnhancements(eventId);
    }, 200);
}

// JSON Export機能を拡張
function enhanceJSONExport() {
    // 元のexportSongData関数を拡張
    if (typeof window.originalExportSongData === "undefined") {
        window.originalExportSongData = window.exportSongData;
    }
    
    // 追加のエクスポートボタンを作成
    addEnhancedExportButton();
}

function enhancedExportSongData() {
    // exportDataから拡張exportDataデータを作成
    let enhancedData = exportData.map(song => {
        return {
            gameMode: song.gameMode,
            name: song.name,  
            artist: song.artist,
            anime: song.anime,
            annId: song.annId,
            songNumber: song.songNumber,
            activePlayers: song.activePlayers,
            totalPlayers: song.totalPlayers,
            
            type: song.typeRaw || song.type, // 数値形式を優先
            typeNumber: song.typeNumber,
            urls: song.urls,
            siteIds: song.siteIds,
            
            difficulty: song.difficultyRaw || song.difficulty, // 数値形式を優先
            animeType: song.animeType,
            animeScore: song.animeScore,
            vintage: song.vintage,
            tags: song.tags,
            genre: song.genre,
            
            altAnimeNames: song.altAnimeNames || [],
            altAnimeNamesAnswers: song.altAnimeNamesAnswers || [],
            startSample: song.startSample,
            videoLength: song.videoLength,
            
            artistInfo: song.artistInfo,
            composerInfo: song.composerInfo,
            arrangerInfo: song.arrangerInfo,
            players: song.players,
            fromList: song.fromList,
            correct: song.correct,
            selfAnswer: song.selfAnswer
        };
    });
    
    let d = new Date();
    let fileName = "enhanced_song_export_";
    fileName += d.getFullYear() + "-";
    fileName += (d.getMonth() + 1 < 10 ? "0" + (d.getMonth() + 1) : d.getMonth() + 1) + "-";
    fileName += (d.getDate() < 10 ? ("0" + d.getDate()) : d.getDate()) + "_";
    fileName += (d.getHours() < 10 ? ("0" + d.getHours()) : d.getHours()) + "-";
    fileName += (d.getMinutes() < 10 ? ("0" + d.getMinutes()) : d.getMinutes()) + "-";
    fileName += (d.getSeconds() < 10 ? ("0" + d.getSeconds()) : d.getSeconds()) + ".json";
    
    let JSONData = new Blob([JSON.stringify(enhancedData, null, 2)], { type: "application/json" });
    let tmpLink = $(`<a href="${URL.createObjectURL(JSONData)}" download="${fileName}"></a>`);
    $(document.body).append(tmpLink);
    tmpLink.get(0).click();
    tmpLink.remove();
}

function addEnhancedExportButton() {
    // 遅延実行で元のボタンが作成された後に追加
    setTimeout(() => {
        if ($("#slExport").length > 0 && $("#slEnhancedExport").length === 0) {
            // 拡張エクスポートボタンを追加
            let enhancedExportButton = $(`<button id="slEnhancedExport" class="btn btn-success songListOptionsButton" type="button" style="margin-right: 5px;"><i aria-hidden="true" class="fa fa-download"></i></button>`)
                .click(() => {
                    enhancedExportSongData();
                })
                .popover({
                    placement: "bottom",
                    content: "Enhanced Export (More Fields + Statistics)",
                    trigger: "hover",
                    container: "body",
                    animation: false
                });
            
            // 元のエクスポートボタンの右側に追加
            $("#slExport").before(enhancedExportButton);
        }
    }, 2000);
}

// CSS追加
AMQ_addStyle(`
    #addonLibraryButton {
        width: 80px;
        left: 104px;
        display: flex;
        align-items: center;
        background-color: #4CAF50;
        color: white;
    }
    
    #addonLibraryButton:hover {
        background-color: #45a049;
    }
    
    #slEnhancedExport {
        background-color: #28a745 !important;
        border-color: #28a745 !important;
    }
    
    #slEnhancedExport:hover {
        background-color: #218838 !important;
        border-color: #1e7e34 !important;
    }
`);

console.log("AMQ Song List UI Addon script loaded!");