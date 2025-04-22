function extractYoutubeVideoID(url) {
    // 쇼트 URL 패턴 추가
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&.*)?/;
    const match = url.match(regex);
    console.log('URL:', url);
    console.log('Match:', match);
    return match ? match[1] : null;
}
