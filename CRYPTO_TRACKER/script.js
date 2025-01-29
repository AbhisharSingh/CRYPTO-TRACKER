const cryptoApiUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false';
let cryptos = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let darkMode = JSON.parse(localStorage.getItem('darkMode')) || false;

// Apply Dark Mode
function applyDarkMode() {
    document.body.classList.toggle("dark-mode", darkMode);
}

document.querySelector('.dark-mode-toggle').addEventListener('click', () => {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    applyDarkMode();
});

// Fetch Crypto Data
function fetchCryptos() {
    fetch(cryptoApiUrl)
        .then(response => response.json())
        .then(data => {
            cryptos = data;
            renderCryptos();
        })
        .catch(error => console.error('Error fetching cryptos:', error));
}

// Render Cryptos
function renderCryptos(filteredCryptos = cryptos) {
    const cryptoList = document.getElementById('crypto-list');
    cryptoList.innerHTML = filteredCryptos.map(crypto => `
        <div class="crypto">
            <h2>${crypto.name}</h2>
            <p>Symbol: ${crypto.symbol.toUpperCase()}</p>
            <p>Price: $${crypto.current_price.toFixed(2)}</p>
            <p>Market Cap: $${crypto.market_cap.toLocaleString()}</p>
            <p class="price-change" style="color: ${crypto.price_change_percentage_24h > 0 ? 'green' : 'red'}">
                ${crypto.price_change_percentage_24h.toFixed(2)}%
            </p>
            <button onclick="addToFavorites('${crypto.id}')">Add to Favorites</button>
        </div>
    `).join('');
    populateConverterOptions();
}

// Render Favorites
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = favorites.map(fav => `
        <div class="crypto">
            <h2>${fav.name}</h2>
            <p>Symbol: ${fav.symbol.toUpperCase()}</p>
            <p>Price: $${fav.current_price.toFixed(2)}</p>
            <p>Market Cap: $${fav.market_cap.toLocaleString()}</p>
        </div>
    `).join('');
}

// Add to Favorites
function addToFavorites(id) {
    const favCrypto = cryptos.find(c => c.id === id);
    if (favCrypto && !favorites.some(f => f.id === id)) {
        favorites.push(favCrypto);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
    }
}

// Sorting Function
function sortCryptos(criteria) {
    const sorted = [...cryptos].sort((a, b) => b[criteria] - a[criteria]);
    renderCryptos(sorted);
}

// Event Listeners for Sorting
document.getElementById("sort-price").addEventListener("click", () => sortCryptos("current_price"));
document.getElementById("sort-market-cap").addEventListener("click", () => sortCryptos("market_cap"));

// Populate Crypto Converter Dropdowns
function populateConverterOptions() {
    const fromSelect = document.getElementById('from-crypto');
    const toSelect = document.getElementById('to-crypto');

    fromSelect.innerHTML = `<option value="">Select Cryptocurrency</option>`;
    toSelect.innerHTML = `<option value="">Select Cryptocurrency</option>`;

    cryptos.forEach(crypto => {
        const option = `<option value="${crypto.id}">${crypto.name}</option>`;
        fromSelect.innerHTML += option;
        toSelect.innerHTML += option;
    });
}

// Crypto Conversion
function convertCrypto() {
    const fromCryptoId = document.getElementById('from-crypto').value;
    const toCryptoId = document.getElementById('to-crypto').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const resultElement = document.getElementById('conversion-result');

    if (!fromCryptoId || !toCryptoId || isNaN(amount) || amount <= 0) {
        resultElement.textContent = 'Please select valid cryptocurrencies and enter a valid amount.';
        return;
    }

    const fromCrypto = cryptos.find(c => c.id === fromCryptoId);
    const toCrypto = cryptos.find(c => c.id === toCryptoId);

    if (fromCrypto && toCrypto) {
        const conversionRate = fromCrypto.current_price / toCrypto.current_price;
        const convertedAmount = amount * conversionRate;
        resultElement.textContent = `${amount} ${fromCrypto.name} = ${convertedAmount.toFixed(6)} ${toCrypto.name}`;
    } else {
        resultElement.textContent = 'Conversion failed. Please try again.';
    }
}

// Load Everything
document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    fetchCryptos();
    renderFavorites();
});

