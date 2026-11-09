const themeToggle=document.getElementById("theme-toggle");
const themeIcon=themeToggle.querySelector("i");
const profileInitial=document.getElementById("profile-initial");
const darkModeToggle=document.getElementById("dark-mode-toggle");
function applyTheme(isDark){
    document.body.classList.toggle("dark-mode",isDark);
    localStorage.setItem(
        "cashlyDarkMode",
        isDark ? "enabled":"disabled"
    );
    themeIcon.classList.toggle("fa-moon", !isDark);
    themeIcon.classList.toggle("fa-sun", isDark);
    if (darkModeToggle){
        darkModeToggle.checked=isDark;
    }
}
const savedDarkMode=localStorage.getItem("cashlyDarkMode");
applyTheme(savedDarkMode==="enabled");
themeToggle.addEventListener("click", function(){
    const isDark=document.body.classList.contains("dark-mode");
    applyTheme(!isDark);
});
if(darkModeToggle){
    darkModeToggle.addEventListener("change",function(){
        applyTheme(darkModeToggle.checked);
    });
}
function updateProfileInitial(){
    const savedName=localStorage.getItem("cashlyUserName");
    if(savedName&&savedName.trim()!==""){
        profileInitial.textContent=savedName.trim().charAt(0).toUpperCase();
    } 
    else{
        profileInitial.textContent="N";
    }
}
updateProfileInitial();

const baseCurrency="KES";
const currencyCacheKey="cashlyExchangeRates";
const oneDay=24*60*60*1000;
let exchangeRates=JSON.parse(
    localStorage.getItem(currencyCacheKey)
)|| null;
window.cashlyFormatCurrency=function(amount){
    const selectedCurrency=localStorage.getItem("cashlyCurrency") ||"KES";
    const rate=exchangeRates?.rates?.[selectedCurrency];
    const convertedAmount=selectedCurrency==="KES"
    ?amount:rate ?amount*rate:amount;
    const displayCurrency=rate || selectedCurrency==="KES"
    ?selectedCurrency:"KES";
    return new Intl.NumberFormat("en-KE",{
        style:"currency",
        currency:displayCurrency
    }).format(convertedAmount);
};
window.cashlyLoadCurrencyRates=async function(){
    const cacheIsFresh=exchangeRates&&Date.now()-exchangeRates.savedAt<oneDay;
    if(cacheIsFresh){
        return;
    }
    try{
        const response=await fetch(
            "https://open.er-api.com/v6/latest/KES"
        );
        if(!response.ok){
            throw new Error("Could not fetch exchange rates.");
        }
        const data=await response.json();
        if(data.result !=="success"){
            throw new Error("Exchange rate service returned an error.");
        }
        exchangeRates={
            rates:data.rates,
            savedAt:Date.now()
        };
        localStorage.setItem(
            currencyCacheKey,
            JSON.stringify(exchangeRates)
        );
        window.dispatchEvent(new Event("currencyRatesUpdated"));
    }
    catch(error){
        console.error("Currency conversion error:",error);
    }
};
window.cashlyLoadCurrencyRates();