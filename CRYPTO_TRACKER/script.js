const cryptoApiUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false';

let cryptos = [];
let filteredCryptos = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let darkMode = JSON.parse(localStorage.getItem('darkMode')) || false;

function safeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function applyDarkMode() {
    document.body.classList.toggle('dark-mode', darkMode);
}

document.querySelector('.dark-mode-toggle').addEventListener('click', () => {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    applyDarkMode();
});

async function fetchCryptos() {
    const cryptoList = document.getElementById('crypto-list');

    try {
        const response = await fetch(cryptoApiUrl);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('Unexpected API response format.');
        }

        cryptos = data;
        filteredCryptos = [...cryptos];
        renderCryptos();
        populateConverterOptions();
    } catch (error) {
        console.error('Error fetching cryptos:', error);
        cryptoList.innerHTML = '<p>Unable to load cryptocurrency data right now. Please try again later.</p>';
    }
}

function renderCryptos() {
    const cryptoList = document.getElementById('crypto-list');

    cryptoList.innerHTML = filteredCryptos.map((crypto) => {
        const priceChange = safeNumber(crypto.price_change_percentage_24h, 0);
        const price = safeNumber(crypto.current_price, 0);
        const marketCap = safeNumber(crypto.market_cap, 0);

        return `
            <div class="crypto">
                <h2>${crypto.name}</h2>
                <p>Symbol: ${crypto.symbol.toUpperCase()}</p>
                <p>Price: $${price.toFixed(2)}</p>
                <p>Market Cap: $${marketCap.toLocaleString()}</p>
                <p class="price-change" style="color: ${priceChange > 0 ? 'green' : 'red'}">
                    ${priceChange.toFixed(2)}%
                </p>
                <button onclick="addToFavorites('${crypto.id}')">Add to Favorites</button>
            </div>
        `;
    }).join('');
}

function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');

    favoritesList.innerHTML = favorites.map((fav) => {
        const price = safeNumber(fav.current_price, 0);
        const marketCap = safeNumber(fav.market_cap, 0);

        return `
            <div class="crypto">
                <h2>${fav.name}</h2>
                <p>Symbol: ${fav.symbol.toUpperCase()}</p>
                <p>Price: $${price.toFixed(2)}</p>
                <p>Market Cap: $${marketCap.toLocaleString()}</p>
                <button onclick="removeFromFavorites('${fav.id}')">Remove</button>
            </div>
        `;
    }).join('');
}

function addToFavorites(id) {
    const favCrypto = cryptos.find((c) => c.id === id);

    if (favCrypto && !favorites.some((f) => f.id === id)) {
        favorites.push(favCrypto);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
    }
}

function removeFromFavorites(id) {
    favorites = favorites.filter((fav) => fav.id !== id);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
}

function sortCryptos(criteria) {
    filteredCryptos = [...filteredCryptos].sort((a, b) => safeNumber(b[criteria]) - safeNumber(a[criteria]));
    renderCryptos();
}

function populateConverterOptions() {
    const fromSelect = document.getElementById('from-crypto');
    const toSelect = document.getElementById('to-crypto');

    const previousFrom = fromSelect.value;
    const previousTo = toSelect.value;

    fromSelect.innerHTML = '<option value="">Select Cryptocurrency</option>';
    toSelect.innerHTML = '<option value="">Select Cryptocurrency</option>';

    cryptos.forEach((crypto) => {
        const option = `<option value="${crypto.id}">${crypto.name}</option>`;
        fromSelect.innerHTML += option;
        toSelect.innerHTML += option;
    });

    if (cryptos.some((crypto) => crypto.id === previousFrom)) {
        fromSelect.value = previousFrom;
    }

    if (cryptos.some((crypto) => crypto.id === previousTo)) {
        toSelect.value = previousTo;
    }
}

function convertCrypto() {
    const fromCryptoId = document.getElementById('from-crypto').value;
    const toCryptoId = document.getElementById('to-crypto').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const resultElement = document.getElementById('conversion-result');

    if (!fromCryptoId || !toCryptoId || Number.isNaN(amount) || amount <= 0) {
        resultElement.textContent = 'Please select valid cryptocurrencies and enter a valid amount.';
        return;
    }

    const fromCrypto = cryptos.find((c) => c.id === fromCryptoId);
    const toCrypto = cryptos.find((c) => c.id === toCryptoId);

    if (fromCrypto && toCrypto) {
        const conversionRate = safeNumber(fromCrypto.current_price) / safeNumber(toCrypto.current_price, 1);
        const convertedAmount = amount * conversionRate;
        resultElement.textContent = `${amount} ${fromCrypto.name} = ${convertedAmount.toFixed(6)} ${toCrypto.name}`;
    } else {
        resultElement.textContent = 'Conversion failed. Please try again.';
    }
}

function filterCryptos(searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    filteredCryptos = cryptos.filter((crypto) => {
        return crypto.name.toLowerCase().includes(normalizedSearch)
            || crypto.symbol.toLowerCase().includes(normalizedSearch);
    });

    renderCryptos();
}

document.getElementById('sort-price').addEventListener('click', () => sortCryptos('current_price'));
document.getElementById('sort-market-cap').addEventListener('click', () => sortCryptos('market_cap'));
document.getElementById('search').addEventListener('input', (event) => filterCryptos(event.target.value));

document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    fetchCryptos();
    renderFavorites();
});

window.convertCrypto = convertCrypto;
window.addToFavorites = addToFavorites;
window.removeFromFavorites = removeFromFavorites;
