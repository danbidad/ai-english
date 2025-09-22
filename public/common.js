function extractYoutubeVideoID(url) {
    // 쇼트 URL 패턴 추가
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&.*)?/;
    const match = url.match(regex);
    console.log('URL:', url);
    console.log('Match:', match);
    return match ? match[1] : null;
}

const languagesList = {
    'en': {name: 'English', nativeName: 'English', flag: 'us'},
    'ja': {name: 'Japanese', nativeName: '日本語', flag: 'jp'},
    'zh': {name: 'Chinese (Simplified)', nativeName: '中文(简体)', flag: 'cn'},
    'zh-TW': {name: 'Chinese (Traditional)', nativeName: '中文(繁體)', flag: 'tw'},
    'es': {name: 'Spanish', nativeName: 'Español', flag: 'es'},
    'fr': {name: 'French', nativeName: 'Français', flag: 'fr'},
    'de': {name: 'German', nativeName: 'Deutsch', flag: 'de'},
    'ru': {name: 'Russian', nativeName: 'Русский', flag: 'ru'},
    'pt': {name: 'Portuguese', nativeName: 'Português', flag: 'pt'},
    'ar': {name: 'Arabic', nativeName: 'العربية', flag: 'sa'},
    'hi': {name: 'Hindi', nativeName: 'हिन्दी', flag: 'in'},
    'it': {name: 'Italian', nativeName: 'Italiano', flag: 'it'},
    'nl': {name: 'Dutch', nativeName: 'Nederlands', flag: 'nl'},
    'sv': {name: 'Swedish', nativeName: 'Svenska', flag: 'se'},
    'th': {name: 'Thai', nativeName: 'ไทย', flag: 'th'},
    'tr': {name: 'Turkish', nativeName: 'Türkçe', flag: 'tr'},
    'vi': {name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: 'vn'},
    'ko': {name: 'Korean', nativeName: '한국어', flag: 'kr'},
};
