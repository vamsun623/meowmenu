// 喵喵豬豬早餐店 - 音效管理模組
// ========================================

const AudioManager = {
    // 音效資源對照表 (使用公開連結)
    SOUNDS: {
        click: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_click_01.mp3',
        success: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_success_01.mp3',
        error: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_error_01.mp3',
        add: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_ping_01.mp3',
        remove: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_pong_01.mp3',
        meow: 'https://github.com/the-muda-project/muda/raw/master/assets/audio/meow.mp3'
    },

    // 緩存已載入的 Audio 物件
    cache: {},

    // 播放音效
    play(type, volume = 0.5) {
        try {
            const url = this.SOUNDS[type];
            if (!url) return;

            // 實例化或從緩存取得
            let audio = this.cache[type];
            if (!audio) {
                audio = new Audio(url);
                this.cache[type] = audio;
            }

            // 重設播放時間 (允許快速連續播放)
            audio.currentTime = 0;
            audio.volume = volume;

            // 處理瀏覽器自動播放限制
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // 通常是被瀏覽器阻擋，安靜地忽略
                    console.warn(`[Audio] 播放音效 ${type} 被阻擋:`, error);
                });
            }
        } catch (err) {
            console.error('[Audio] 播放器異常:', err);
        }
    }
};
