angular.module('youtubeApp', [])
    .filter('formatDuration', function () {
        return function (seconds) {
            if ( !seconds ) return '00:00'
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = Math.floor(seconds % 60)
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        }
    })
    .config(['$sceDelegateProvider', function ($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist([
            'self',
            'https://www.youtube.com/**',
            'https://www.youtube-nocookie.com/**',
            'https://youtu.be/**'
        ])
    }])
    .controller('YoutubeController', ['$scope', '$window', '$http', '$interval', '$location',
        function ($scope, $window, $http, $interval, $location) {
            let player
            let timeUpdateInterval
            let currentSubtitleIndex = -1
            let currentUtterance = null
            let searchParams = new URLSearchParams(window.location.search);
            const videoId = searchParams.get('videoId')

            $scope.youtubeUrl = ''
            $scope.videoId = ''
            $scope.errorMessage = ''
            $scope.isPlaying = false
            $scope.subtitles = []
            $scope.currentTime = 5
            $scope.selectedLang = 'en'
            $scope.currentSubtitle = null
            $scope.selectedWord = null
            $scope.wordMeanings = []
            $scope.popupStyle = {}
            $scope.ttsLoading = false

            $scope.loadVideo = loadVideo
            $scope.togglePlay = togglePlay
            $scope.isCurrentSubtitle = isCurrentSubtitle
            $scope.seekToTime = seekToTime
            $scope.splitWords = splitWords
            $scope.showWordMeaning = showWordMeaning
            $scope.playTTS = playTTS
            $scope.formatTime = formatTime

            // YouTube API 준비
            $window.onYouTubeIframeAPIReady = function () {
                console.log('YouTube API Ready')
            }

            // 페이지를 떠날 때 음성 정리
            $window.onbeforeunload = function () {
                if ( speechSynthesis.speaking ) {
                    speechSynthesis.cancel()
                }
            }

            $scope.isSpeechSupported = 'speechSynthesis' in window

            // 문서 클릭시 팝업 닫기
            angular.element($window).on('click', function () {
                $scope.$apply(function () {
                    $scope.selectedWord = null
                    $scope.wordMeanings = ''
                })
            })

            // 컨트롤러가 소멸될 때 타이머 정리
            $scope.$on('$destroy', function () {
                if ( timeUpdateInterval ) {
                    $interval.cancel(timeUpdateInterval)
                }
            })

            if ( videoId ) {
                console.log(videoId)
                loadVideo(videoId)
            }

            function createPlayer(videoId) {
                if ( player ) {
                    player.destroy()
                    if ( timeUpdateInterval ) {
                        $interval.cancel(timeUpdateInterval)
                    }
                }

                player = new YT.Player('player', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    host: 'https://www.youtube.com',
                    playerVars: {
                        'enablejsapi': 1,
                        'origin': window.location.origin,
                        'controls': 0,
                        'modestbranding': 1,
                        'rel': 0,
                        'showinfo': 0,
                        'loop': 0,
                        'playlist': videoId,
                        'cc_load_policy': 0,
                        'autoplay': 0,
                        'cc_lang_pref': 'en',
                        'hl': 'en'
                    },
                    events: {
                        'onStateChange': onPlayerStateChange,
                        'onReady': onPlayerReady,
                        'onApiChange': onApiChange
                    }
                })

                function onApiChange(event) {
                    // 강제로 영어 캡션으로 바꿈. 캡션이 없으면 자동 생성 영어 캡션을 사용함
                    //player.setOption('captions', 'track', { languageCode: 'en' }); // 영어
                }

                function onPlayerReady(event) {
                    // 플레이어가 준비되면 시간 업데이트 타이머 시작
                    startTimeUpdate()
                }

                function startTimeUpdate() {
                    if ( timeUpdateInterval ) {
                        $interval.cancel(timeUpdateInterval)
                    }
                    timeUpdateInterval = $interval(function () {
                        if ( player && player.getCurrentTime ) {
                            $scope.currentTime = player.getCurrentTime()
                            updateCurrentSubtitle($scope.currentTime)
                        }
                    }, 100)
                }

                function updateCurrentSubtitle(currentTime) {
                    let newSubtitleIndex = -1

                    // 현재 시간에 해당하는 자막 찾기
                    for ( let i = 0 ; i < $scope.subtitles.length ; i++ ) {
                        const subtitle = $scope.subtitles[i]
                        if ( $scope.isCurrentSubtitle(subtitle) ) {
                            newSubtitleIndex = i
                            $scope.currentSubtitle = subtitle
                            break
                        }
                    }

                    // 현재 자막이 없는 경우
                    if ( newSubtitleIndex === -1 ) {
                        $scope.currentSubtitle = null
                    }

                    // 자막이 바뀌었을 때만 스크롤
                    if ( newSubtitleIndex !== currentSubtitleIndex && newSubtitleIndex !== -1 ) {
                        currentSubtitleIndex = newSubtitleIndex
                        scrollToSubtitle(newSubtitleIndex)
                    }
                }

                function onPlayerStateChange(event) {
                    $scope.$apply(function () {
                        $scope.isPlaying = event.data === YT.PlayerState.PLAYING
                    })
                }

                function scrollToSubtitle(index) {
                    const subtitleElement = document.getElementById(`subtitle-${index}`)
                    if ( subtitleElement ) {
                        //subtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }

            function formatTime(seconds) {
                const minutes = Math.floor(seconds / 60)
                const remainingSeconds = Math.floor(seconds % 60)
                return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
            }

            function loadVideo(directVideoId) {
                const url = $scope.youtubeUrl.trim()
                const videoId = directVideoId ?? extractYoutubeVideoID(url)
                if ( videoId ) {
                    $scope.videoId = videoId
                    $scope.errorMessage = ''
                    setTimeout(() => createPlayer(videoId), 100)
                    fetchSubtitles(videoId)
                } else {
                    $scope.videoId = ''
                    $scope.errorMessage = '유효한 유튜브 URL을 입력하세요.'
                }

                function fetchSubtitles(videoId) {
                    $http.get(`/subtitles/${videoId}/${$scope.selectedLang}`)
                        .then(function (response) {
                            if ( response.data.subtitles ) {
                                $scope.subtitles = response.data.subtitles
                                currentSubtitleIndex = -1
                                $scope.currentSubtitle = null
                            } else {
                                console.log('자막이 없습니다.')
                            }
                        })
                        .catch(function (error) {
                            console.error('자막 가져오기 오류:', error)
                        })
                }
            }


            function togglePlay() {
                if ( !player ) return

                if ( $scope.isPlaying ) {
                    player.pauseVideo()
                } else {
                    player.playVideo()
                }
            }

            function isCurrentSubtitle(subtitle) {
                const start = parseFloat(subtitle.start)
                const duration = parseFloat(subtitle.dur)
                let result = start <= $scope.currentTime &&
                    $scope.currentTime <= (start + duration)
                return result
            }

            function seekToTime(seconds) {
                if ( player && player.seekTo ) {
                    player.seekTo(seconds, true)

                    // 일시정지 상태였다면 재생 시작
                    if ( !$scope.isPlaying ) {
                        player.playVideo()
                    }
                }
            }


            function splitWords(text) {
                return text.split(/\s+/)
            }

            function showWordMeaning(event, word) {
                // 기존 팝업 닫기
                event.stopPropagation()

                // 영어 단어인지 확인 (숫자나 특수문자 제외)
                if ( !/^[a-zA-Z]+$/.test(word) ) {
                    return
                }

                // 팝업 위치 설정
                const rect = event.target.getBoundingClientRect()
                $scope.popupStyle = {
                    left: rect.left + 'px',
                    top: (rect.bottom + 5) + 'px'
                }

                // 단어 의미 가져오기
                $http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
                    .then(function (response) {
                        $scope.selectedWord = word
                        $scope.wordMeanings = response.data[0].meanings
                    })
                    .catch(function (error) {
                        console.error('단어 검색 오류:', error)
                    })
            }

            function playTTS(text, event, index) {
                if ( !$scope.isSpeechSupported ) return

                event.stopPropagation()
                const icon = event.target

                // 이전 재생 중인 음성이 있다면 중지
                if ( speechSynthesis.speaking ) {
                    speechSynthesis.cancel()
                    if ( currentUtterance === text ) {
                        currentUtterance = null
                        return
                    }
                }

                currentUtterance = text
                const utterance = setupUtterance(text)

                utterance.lang = "en-US"
                const voices = window.speechSynthesis.getVoices()

                // 영어 음성 필터링 및 설정
                const englishVoices = voices.reduce((acc, cur) => {
                    if ( cur.lang === 'en-US' ) acc.push(cur)
                    return acc
                }, [])
                if ( englishVoices[index] ) {
                    utterance.voice = englishVoices[index]
                }

                // 재생 상태 표시
                icon.classList.add('speaking')

                utterance.onend = function () {
                    $scope.$apply(function () {
                        icon.classList.remove('speaking')
                        currentUtterance = null
                    })
                }

                utterance.onerror = function () {
                    $scope.$apply(function () {
                        icon.classList.remove('speaking')
                        currentUtterance = null
                    })
                }

                speechSynthesis.speak(utterance)

                // 음성 설정
                function setupUtterance(text) {
                    const utterance = new SpeechSynthesisUtterance(text)
                    utterance.lang = 'en-US'
                    utterance.rate = 0.9  // 속도 조절
                    utterance.pitch = 1   // 음높이

                    // 영어 음성 선택 (가능한 경우)
                    const voices = speechSynthesis.getVoices()
                    const englishVoice = voices.find(voice =>
                        voice.lang.includes('en') && voice.name.includes('Female'))
                    if ( englishVoice ) {
                        utterance.voice = englishVoice
                    }

                    return utterance
                }
            }
        }])
