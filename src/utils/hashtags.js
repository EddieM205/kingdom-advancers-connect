export const extractHashtags = (text) => {
    const regex = /#[\w]+/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches.map(h => h.toLowerCase()))];
};

export const linkifyHashtags = (text) => {
    return text.replace(/#[\w]+/g, (tag) => 
        `<a href="/Discover?tag=${tag.substring(1)}" class="text-blue-500 hover:underline">${tag}</a>`
    );
};