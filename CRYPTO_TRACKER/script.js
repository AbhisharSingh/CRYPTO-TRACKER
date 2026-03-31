const apiBase = 'https://api.coingecko.com/api/v3/coins/markets';
const fallbackApiBase = 'https://api.coincap.io/v2/assets';

const state = {
    cryptos: [],
    filtered: [],
    favorites: JSON.parse(localStorage.getItem('favorites')) || [],
    darkMode: JSON.parse(localStorage.getItem('darkMode')) || false,
    currency: 'usd',
};

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function fmtCurrency(value) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: state.currency.toUpperCase(),
        maximumFractionDigits: 2,
    });

    return formatter.format(safeNumber(value));
}

function setStatus(message) {
    document.getElementById('api-status').textContent = `Status: ${message}`;
}

function setLastUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleString()}`;
}

function applyDarkMode() {
    document.body.classList.toggle('dark-mode', state.darkMode);
}

function mapCoinCapToCoinGeckoShape(data) {
    return data.slice(0, 20).map((item) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        current_price: safeNumber(Number(item.priceUsd)),
        market_cap: safeNumber(Number(item.marketCapUsd)),
        price_change_percentage_24h: safeNumber(Number(item.changePercent24Hr)),
    }));
}

async function fetchFromCoinGecko() {
    const url = `${apiBase}?vs_currency=${state.currency}&order=market_cap_desc&per_page=20&page=1&sparkline=false`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`CoinGecko request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error('Invalid CoinGecko response format.');
    }

    return data;
}

async function fetchFromCoinCap() {
    const response = await fetch(`${fallbackApiBase}?limit=20`);

    if (!response.ok) {
        throw new Error(`CoinCap request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid CoinCap response format.');
    }

    return mapCoinCapToCoinGeckoShape(data.data);
}

async function fetchCryptos() {
    try {
        setStatus('Loading from CoinGecko...');
        state.cryptos = await fetchFromCoinGecko();
        setStatus('Live market data loaded from CoinGecko.');
    } catch (primaryError) {
        console.error(primaryError);
        try {
            setStatus('CoinGecko unavailable. Trying CoinCap fallback...');
            state.cryptos = await fetchFromCoinCap();
            setStatus('Data loaded from CoinCap fallback.');
        } catch (fallbackError) {
            console.error(fallbackError);
            setStatus('Unable to load market data. Please retry in a minute.');
            document.getElementById('crypto-list').innerHTML = '<p>Market feed is currently unavailable.</p>';
            return;
        }
    }

    state.filtered = [...state.cryptos];
    setLastUpdated();
    renderCryptos();
    renderTopMovers();
    renderFavorites();
    populateConverterOptions();
}

function createCryptoCard(crypto, favoritesMode = false) {
    const priceChange = safeNumber(crypto.price_change_percentage_24h);
    const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';

    return `
        <div class="crypto">
            <h3>${crypto.name}</h3>
            <p><strong>${crypto.symbol.toUpperCase()}</strong></p>
            <p>Price: ${fmtCurrency(crypto.current_price)}</p>
            <p>Market Cap: ${fmtCurrency(crypto.market_cap)}</p>
            <p class="price-change ${priceChangeClass}">${priceChange.toFixed(2)}%</p>
            <button onclick="${favoritesMode ? `removeFromFavorites('${crypto.id}')` : `addToFavorites('${crypto.id}')`}" type="button">
                ${favoritesMode ? 'Remove' : 'Add to Favorites'}
            </button>
        </div>
    `;
}

function renderCryptos() {
    const cryptoList = document.getElementById('crypto-list');
    cryptoList.innerHTML = state.filtered.map((coin) => createCryptoCard(coin)).join('');
}

function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = state.favorites.map((coin) => createCryptoCard(coin, true)).join('');
}

function renderTopMovers() {
    const movers = [...state.cryptos]
        .sort((a, b) => safeNumber(b.price_change_percentage_24h) - safeNumber(a.price_change_percentage_24h))
        .slice(0, 5);

    document.getElementById('top-movers').innerHTML = movers.map((coin) => {
        const change = safeNumber(coin.price_change_percentage_24h);
        return `<li><span>${coin.name}</span><strong class="${change >= 0 ? 'positive' : 'negative'}">${change.toFixed(2)}%</strong></li>`;
    }).join('');
}

function addToFavorites(id) {
    const selected = state.cryptos.find((c) => c.id === id);
    if (selected && !state.favorites.some((f) => f.id === id)) {
        state.favorites.push(selected);
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
        renderFavorites();
    }
}

function removeFromFavorites(id) {
    state.favorites = state.favorites.filter((f) => f.id !== id);
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    renderFavorites();
}

function sortCryptos(criteria) {
    state.filtered = [...state.filtered].sort((a, b) => safeNumber(b[criteria]) - safeNumber(a[criteria]));
    renderCryptos();
}

function filterCryptos(term) {
    const query = term.trim().toLowerCase();
    state.filtered = state.cryptos.filter((coin) => coin.name.toLowerCase().includes(query) || coin.symbol.toLowerCase().includes(query));
    renderCryptos();
}

function populateConverterOptions() {
    const from = document.getElementById('from-crypto');
    const to = document.getElementById('to-crypto');

    from.innerHTML = '<option value="">Select Cryptocurrency</option>';
    to.innerHTML = '<option value="">Select Cryptocurrency</option>';

    state.cryptos.forEach((coin) => {
        const option = `<option value="${coin.id}">${coin.name}</option>`;
        from.innerHTML += option;
        to.innerHTML += option;
    });
}

function convertCrypto() {
    const fromId = document.getElementById('from-crypto').value;
    const toId = document.getElementById('to-crypto').value;
    const amount = Number(document.getElementById('amount').value);
    const result = document.getElementById('conversion-result');

    if (!fromId || !toId || !Number.isFinite(amount) || amount <= 0) {
        result.textContent = 'Please choose two assets and enter a valid amount.';
        return;
    }

    const fromCoin = state.cryptos.find((c) => c.id === fromId);
    const toCoin = state.cryptos.find((c) => c.id === toId);

    if (!fromCoin || !toCoin) {
        result.textContent = 'Unable to calculate conversion right now.';
        return;
    }

    const rate = safeNumber(fromCoin.current_price) / safeNumber(toCoin.current_price, 1);
    result.textContent = `${amount} ${fromCoin.symbol.toUpperCase()} = ${(amount * rate).toFixed(6)} ${toCoin.symbol.toUpperCase()}`;
}

function initEvents() {
    document.querySelector('.dark-mode-toggle').addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        localStorage.setItem('darkMode', JSON.stringify(state.darkMode));
        applyDarkMode();
    });

    document.getElementById('refresh-data').addEventListener('click', fetchCryptos);
    document.getElementById('sort-price').addEventListener('click', () => sortCryptos('current_price'));
    document.getElementById('sort-market-cap').addEventListener('click', () => sortCryptos('market_cap'));
    document.getElementById('search').addEventListener('input', (event) => filterCryptos(event.target.value));
    document.getElementById('convert-btn').addEventListener('click', convertCrypto);
    document.getElementById('currency-selector').addEventListener('change', async (event) => {
        state.currency = event.target.value;
        await fetchCryptos();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    initEvents();
    fetchCryptos();
    setInterval(fetchCryptos, 120000);
});

window.addToFavorites = addToFavorites;
window.removeFromFavorites = removeFromFavorites;
