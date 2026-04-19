export const postThemes = [
    { id: 'default', name: 'Default', class: 'bg-card text-card-foreground' },
    { id: 'scripture', name: 'Scripture', class: 'bg-gradient-to-br from-amber-50 to-amber-100 text-stone-800 border border-amber-200 shadow-sm' },
    { id: 'ocean', name: 'Ocean', class: 'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-900' },
    { id: 'sunset', name: 'Sunset', class: 'bg-gradient-to-br from-orange-100 to-yellow-100 text-orange-900' },
    { id: 'meadow', name: 'Meadow', class: 'bg-gradient-to-br from-green-100 to-lime-100 text-green-900' },
    { id: 'aurora', name: 'Aurora', class: 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-900' },
    { id: 'rose', name: 'Rose', class: 'bg-gradient-to-br from-rose-100 to-pink-100 text-rose-900' },
    { id: 'dawn', name: 'Dawn', class: 'bg-gradient-to-br from-gray-300 to-gray-100 text-gray-800' },
    { id: 'dusk', name: 'Dusk', class: 'bg-gradient-to-br from-gray-700 to-gray-900 text-white' },
    { id: 'sky', name: 'Sky', class: 'bg-gradient-to-br from-sky-400 to-cyan-300 text-white' },
    { id: 'fire', name: 'Fire', class: 'bg-gradient-to-br from-red-500 to-orange-400 text-white' },
    { id: 'royal', name: 'Royal', class: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' },
];

export const getThemeClass = (themeId) => {
    const theme = postThemes.find(t => t.id === themeId);
    return theme ? theme.class : 'bg-card text-card-foreground';
};