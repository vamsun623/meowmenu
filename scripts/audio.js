// 喵喵豬豬早餐店 - 音效管理模組 (增強版)
// ========================================

const AudioManager = {
    // 音效資源對照表
    SOUNDS: {
        success: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_success_01.mp3',
        error: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/ui_error_01.mp3',
        meow: 'assets/sounds/meow.mp3'
    },

    // 緩存已載入的 Audio 物件
    cache: {},
    audioCtx: null,

    // 初始化 Web Audio API (務必在使用者互動中呼叫)
    initCtx() {
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[Audio] AudioContext 已建立');
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().then(() => {
                    console.log('[Audio] AudioContext 已恢復 (State: ' + this.audioCtx.state + ')');
                });
            }
        } catch (e) {
            console.error('[Audio] 初始化 Context 失敗:', e);
        }
    },

    // 播放合成音效 (不依賴網路，最高可靠性)
    playSynthetic(type) {
        try {
            this.initCtx();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'click') {
                // 短促的點擊聲 (更明顯的 Pop 聲)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'add') {
                // 輕快的上升音 (Ping)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'remove') {
                // 輕快的下降音 (Pong)
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'meow_sub') {
                // 合成喵聲的代用品 (如果 MP3 失敗)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
                gain.gain.linearRampToValueAtTime(0, now + 0.3);

                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {
            console.warn('[Audio] 合成音效失敗:', e);
        }
    },

    // 播放音效
    play(type, volume = 0.5) {
        // 先確保 Context 試圖啟動
        this.initCtx();

        return new Promise((resolve, reject) => {
            // click, add, remove 使用合成音效
            if (['click', 'add', 'remove'].includes(type)) {
                try {
                    this.playSynthetic(type);
                    resolve();
                } catch (e) {
                    reject(e);
                }
                return;
            }

            try {
                const url = this.SOUNDS[type];
                if (!url) {
                    resolve();
                    return;
                }

                let audio = this.cache[type];
                if (!audio) {
                    audio = new Audio();
                    audio.crossOrigin = "anonymous";
                    audio.src = url;
                    audio.preload = "auto";

                    audio.onerror = (e) => {
                        console.error(`[Audio] ${type} 載入失敗 (URL: ${url}):`, e);
                        if (type === 'meow') {
                            console.log('[Audio] 嘗試播放合成喵聲作為代用');
                            this.playSynthetic('meow_sub');
                        }
                    };

                    this.cache[type] = audio;
                }

                audio.currentTime = 0;
                audio.volume = volume;

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(resolve).catch(err => {
                        console.warn(`[Audio] ${type} 播放被擋:`, err.name);
                        // 如果是 meow 且被擋，可以嘗試用合成音（雖然通常合成音也會被擋直到互動）
                        reject(err);
                    });
                } else {
                    resolve();
                }
            } catch (err) {
                console.error('[Audio] 播放異常:', err);
                reject(err);
            }
        });
    }
};
