// ==UserScript==
// @name         AMQ Song List UI Cory Addon
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
let enhancedSongData = new Map(); // songNumberをキーとして追加データを保存

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
        setTimeout(() => {
            let songNumber = parseInt($("#qpCurrentSongCount").text());
            
            // 追加データを収集
            let enhancedData = {
                // 追加項目
                typeNumber: result.songInfo.typeNumber,
                altAnimeNames: result.songInfo.altAnimeNames,
                altAnimeNamesAnswers: result.songInfo.altAnimeNamesAnswers,
                artistInfo: result.songInfo.artistInfo,
                composerInfo: result.songInfo.composerInfo,
                arrangerInfo: result.songInfo.arrangerInfo,
                
                // 元のamqSongListUIとの違い
                // type処理: 元は文字列変換、こちらは数値のまま
                typeRaw: result.songInfo.type,
                typeFormatted: result.songInfo.type === 3 ? "Insert Song" : (result.songInfo.type === 2 ? "Ending " + result.songInfo.typeNumber : "Opening " + result.songInfo.typeNumber),
                
                // difficulty処理: 元は.toFixed(1)、こちらはそのまま
                difficultyRaw: result.songInfo.animeDifficulty,
                difficultyFormatted: typeof result.songInfo.animeDifficulty === "string" ? "Unrated" : result.songInfo.animeDifficulty.toFixed(1)
            };
            
            // songNumberをキーとして追加データを保存
            enhancedSongData.set(songNumber, enhancedData);
        }, 0);
    });
    
    enhancedAnswerResultsListener.bindListener();
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
    // bot対応形式でのエクスポート
    let enhancedData = exportData.map(song => {
        let additionalData = enhancedSongData.get(song.songNumber) || {};
        
        return {
            gameMode: song.gameMode,
            name: song.name,  
            artist: song.artist,
            anime: song.anime,
            annId: song.annId,
            songNumber: song.songNumber,
            activePlayers: song.activePlayers,
            totalPlayers: song.totalPlayers,
            
            type: additionalData.typeRaw || song.type,
            typeNumber: additionalData.typeNumber,
            urls: song.urls,
            siteIds: song.siteIds,
            
            difficulty: additionalData.difficultyRaw || song.difficulty,
            animeType: song.animeType,
            animeScore: song.animeScore,
            vintage: song.vintage,
            tags: song.tags,
            genre: song.genre,
            
            altAnimeNames: additionalData.altAnimeNames || song.altAnimeNames,
            altAnimeNamesAnswers: additionalData.altAnimeNamesAnswers || song.altAnimeNamesAnswers,
            startSample: song.startSample,
            videoLength: song.videoLength,
            
            artistInfo: additionalData.artistInfo,
            composerInfo: additionalData.composerInfo,
            arrangerInfo: additionalData.arrangerInfo,
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