const addTransactionBtn=document.getElementById("add-transaction-btn");
const transactionModal=document.getElementById("transaction-modal");
const cancelTransactionBtn=document.getElementById("cancel-transaction");
const transactionForm=document.getElementById("transaction-form");
const transactionList=document.querySelector(".transaction-list");
const transactionCount=document.querySelector(".transaction-count");
const transactionType=document.getElementById("transaction-type");
const transactionCategory=document.getElementById("transaction-category");
const transactionDescription=document.getElementById("transaction-description");
const transactionDate=document.getElementById("transaction-date");
const transactionAmount=document.getElementById("transaction-amount");
let editingTransactionId=null;
const summaryCards=document.querySelectorAll(".transaction-summary-card h2");
const tableSearch=document.getElementById("table-search");
const typeFilter=document.getElementById("type-filter");
const categoryFilter=document.getElementById("category-filter");
const dateFilter=document.getElementById("date-filter");
const sortFilter=document.getElementById("sort-filter");
const customDateRange=document.getElementById("custom-date-range");
const startDate=document.getElementById("start-date");
const endDate=document.getElementById("end-date");
let customCategories=JSON.parse(
    localStorage.getItem("cashlyCustomCategories")
) || [];
const defaultCategories=[
{name:"Food",type:"expense"},
{name:"Transport",type:"expense"},
{name:"Bills",type:"expense"},
{name:"Shopping",type:"expense"},
{name:"Salary",type:"income"},
{name:"Freelance",type:"income"},    
];
function getAllCategories(){
    return[...defaultCategories,...customCategories];
}
function populateTransactionCategories(){
    const selectedType=transactionType.value;
    const previousCategory=transactionCategory.value;
    transactionCategory.innerHTML='<option value="">Select Category</option>';
    const availableCategories=getAllCategories().filter(function(category){
        return category.type===selectedType;
    });
    availableCategories.forEach(function(category){
        const option=document.createElement("option");
        option.value=category.name.toLowerCase();
        option.textContent=category.name;
        transactionCategory.appendChild(option);
    });
    if (availableCategories.some(function(category){
        return category.name.toLowerCase()===previousCategory;
    })){
        transactionCategory.value=previousCategory;
    }
}
function populateCategoryFilter(){
    const previousCategory=categoryFilter.value;
    categoryFilter.innerHTML='<option value="all">All Categories</option>';
    getAllCategories().forEach(function(category){
        const option=document.createElement("option");
        option.value=category.name.toLowerCase();
        option.textContent=category.name;
        categoryFilter.appendChild(option);
    });
    categoryFilter.value=previousCategory;
}
transactionType.addEventListener("change",function(){
    populateTransactionCategories();
});
populateTransactionCategories();
populateCategoryFilter();
addTransactionBtn.addEventListener("click",function(){
    editingTransactionId=null;
    document.getElementById("modal-title").textContent="Add Transaction";
    document.getElementById("save-transaction").textContent="Save Transaction"
    transactionForm.reset();
    transactionModal.hidden=false;
});
cancelTransactionBtn.addEventListener("click",function(){
    transactionModal.hidden=true;
});

const sampleTransactions=[
    {
        id: 1,
        type:"income",
        category:"salary",
        description:"Monthly Salary",
        date:"2026-11-01",
        amount:95000
    },
    {
        id: 2,
        type:"expense",
        category:"food",
        description:"Lunch at cafe",
        date:"2026-11-02",
        amount:800

    },
    {
        id: 3,
        type:"expense",
        category:"transport",
        description:"Matatu fare",
        date:"2026-11-03",
        amount:300
    },
];

let transactions=JSON.parse(localStorage.getItem("cashlyTransactions")) || sampleTransactions;
function saveTransactions(){
    localStorage.setItem("cashlyTransactions", JSON.stringify(transactions));
}
function updateSummaryCards(){
    const totalIncome=transactions
    .filter(function(transaction){
        return transaction.type==="income";
    })
    .reduce(function(total,transaction){
        return total+transaction.amount;
    },0);
    const totalExpenses=transactions
    .filter(function(transaction){
        return transaction.type==="expense";
    })
    .reduce(function(total,transaction){
        return total+transaction.amount;
    },0);
    const totalTransactions=transactions.length;
    summaryCards[0].textContent=totalTransactions;
    summaryCards[1].textContent=window.cashlyFormatCurrency(totalIncome);
    summaryCards[2].textContent=window.cashlyFormatCurrency(totalExpenses);
}
function formatDate(date){
    return new Date(date+"T00:00:00").toLocaleDateString("en-US",{
        month:"short",
        day:"2-digit",
        year:"numeric"
    });
}
       
function displayTransactions(transactionArray=transactions){
    transactionList.innerHTML="";
    transactionArray.forEach(function(transaction){
        const row=document.createElement("tr");
        row.dataset.id=transaction.id;
        const typeClass=transaction.type==="income" ? "income":"expense";
        const icon=transaction.type==="income" ? 
        "fa-solid fa-arrow-up-long":
        "fa-solid fa-arrow-down-long";
        const formattedAmount=window.cashlyFormatCurrency(transaction.amount);
        const sign=transaction.type==="income" ? "+": "-";
        row.innerHTML= `
        <td>
           <span class="transaction-icon ${typeClass}">
             <i class ="${icon}"></i>
            </span>
        </td>

        <td>${transaction.category.charAt(0).toUpperCase()+ transaction.category.slice(1)}</td>
        <td>${transaction.description}</td>

        <td>${formatDate(transaction.date)}</td>

        <td class="${typeClass}-text">
          ${sign}${formattedAmount}
        </td>

        <td>
          <button class="action-button edit-button" aria-label="Edit Transaction">
           <i class="fa-solid fa-pen-nib"></i>
           </button>
          <button class="action-button delete-button" aria-label="Delete Transaction">
           <i class="fa-solid fa-trash"></i>
           </button>
        </td>
        `;
       transactionList.appendChild(row); 
    });

    transactionCount.textContent=`Showing ${transactionArray.length} transactions`;
    updateSummaryCards();
}
transactionForm.addEventListener("submit",function(event){
    event.preventDefault();
    const transactionData={
        type:transactionType.value,
        category:transactionCategory.value,
        description:transactionDescription.value.trim(),
        date:transactionDate.value,
        amount:Number(transactionAmount.value)
    };
    if(editingTransactionId !==null){
        transactions=transactions.map(function(transaction){
            if(transaction.id===editingTransactionId){
                return{
                    ...transaction,
                    ...transactionData
                };
            }
            return transaction;
        });
    } else{
        const newTransaction={
            id:Date.now(),
            ...transactionData
        };
        transactions.push(newTransaction);
    }
    saveTransactions();
    displayTransactions();
    transactionForm.reset();
    transactionModal.hidden=true;
    editingTransactionId=null;
});
displayTransactions();

transactionList.addEventListener("click",function(event){
    const deleteButton=event.target.closest(".delete-button");
    if(!deleteButton){
        return;
    }
    const row=deleteButton.closest("tr");
    const transactionId=Number(row.dataset.id);
    const confirmDelete=confirm("Are you sure you want to delete this transaction?");
    if(confirmDelete){
        transactions=transactions.filter(function(transaction){
            return transaction.id !== transactionId;
        });
        saveTransactions();
        displayTransactions();
    }
});
transactionList.addEventListener("click",function(event){
    const editButton=event.target.closest(".edit-button");
    if(!editButton){
        return;
    }
    const row=editButton.closest("tr");
    editingTransactionId=Number(row.dataset.id);
    const transaction=transactions.find(function(item){
        return item.id===editingTransactionId;
    });
    if(!transaction){
        return;
    }

    transactionType.value=transaction.type;
    populateTransactionCategories();
    transactionCategory.value=transaction.category;
    transactionDescription.value=transaction.description;
    transactionDate.value=transaction.date;
    transactionAmount.value=transaction.amount;

    document.getElementById("modal-title").textContent="Edit Transaction";
    document.getElementById("save-transaction").textContent="Update Transaction";
    transactionModal.hidden=false;
});

const urlParams=new URLSearchParams(window.location.search);
if(urlParams.get("add")==="true"){
    editingTransactionId=null;
    transactionForm.reset();
    document.getElementById("modal-title").textContent="Add Transaction";
    document.getElementById("save-transaction").textContent="Save Transaction";
    transactionModal.hidden=false;
}

function filterTransactions(){
    let filteredTransactions=[...transactions];
    const searchValue=tableSearch.value.toLowerCase();
    filteredTransactions=filteredTransactions.filter(function(transaction){
        return transaction.description.toLowerCase().includes(searchValue);
    });
    if (typeFilter.value !== "all"){
        filteredTransactions=filteredTransactions.filter(function(transaction){
            return transaction.type===typeFilter.value;
        });
    }
    if (categoryFilter.value !=="all"){
        filteredTransactions=filteredTransactions.filter(function(transaction){
            return transaction.category===categoryFilter.value;
        });
    }
    const today=new  Date();
    today.setHours(0,0,0,0);
    if(dateFilter.value==="7days"){
        const sevenDaysAgo=new Date();
        sevenDaysAgo.setDate(today.getDate()-6);
        sevenDaysAgo.setHours(0,0,0,0);
        filteredTransactions=filteredTransactions.filter(function(transaction){
            const transactionDate=new Date (transaction.date+"T00:00:00");
            return transactionDate>=sevenDaysAgo&&transactionDate<=today;
        });
    }
    else if(dateFilter.value==="month"){
        filteredTransactions=filteredTransactions.filter(function(transaction){
            const transactionDate=new Date(transaction.date+"T00:00:00");
            return transactionDate.getMonth()===today.getMonth()&&
            transactionDate.getFullYear()===today.getFullYear();
        });
    }
    else if(dateFilter.value==="custom"){
        filteredTransactions=filteredTransactions.filter(function(transaction){
            const transactionDate=transaction.date;
            const afterStart=!startDate.value ||transactionDate>=startDate.value;
            const beforeEnd=!endDate.value ||transactionDate<=endDate.value;
            return afterStart&&beforeEnd;
        });
    }
    if (sortFilter.value==="newest"){
        filteredTransactions.sort(function(a,b){
            return new Date(b.date)-new Date(a.date);
        });
    }
    else if (sortFilter.value==="oldest"){
        filteredTransactions.sort(function(a,b){
            return new Date(a.date)-new Date(b.date);
        });
    }
    else if(sortFilter.value==="highest"){
        filteredTransactions.sort(function(a,b){
            return b.amount-a.amount;
        });
    }
    else if(sortFilter.value==="lowest"){
        filteredTransactions.sort(function(a,b){
            return a.amount-b.amount;
        });
    }
    displayTransactions(filteredTransactions);
}

tableSearch.addEventListener("input",filterTransactions);
typeFilter.addEventListener("change",filterTransactions);
categoryFilter.addEventListener("change",filterTransactions);
dateFilter.addEventListener("change",function(){
    customDateRange.hidden=dateFilter.value !=="custom";
    filterTransactions();
});
sortFilter.addEventListener("change",filterTransactions);
startDate.addEventListener("change",filterTransactions);
endDate.addEventListener("change",filterTransactions);

window.addEventListener("currencyRatesUpdated",function(){
    location.reload();
});