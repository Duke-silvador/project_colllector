const transactions= JSON.parse(
    localStorage.getItem("cashlyTransactions")
) || [];
const dashboardIncome=document.getElementById("dashboard-income");
const dashboardExpenses=document.getElementById("dashboard-expenses");
const dashboardBalance=document.getElementById("dashboard-balance");
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
const availableBalance=totalIncome-totalExpenses;
function formatCurrency(amount){
    return window.cashlyFormatCurrency(amount);
}
function convertAmount(amount){
    const selectedCurrency=localStorage.getItem("cashlyCurrency")||"KES";
    const rates=JSON.parse(
        localStorage.getItem("cashlyExchangeRates")
    );
    if (selectedCurrency==="KES"){
        return amount;
    }
    if (!rates|| !rates.rates[selectedCurrency]){
        return amount;
    }
    return amount*rates.rates[selectedCurrency];
}
function formatConvertedAmount(amount){
    const selectedCurrency=localStorage.getItem("cashlyCurrency")||"KES";
    return new Intl.NumberFormat("en-KE",{
        style:"currency",
        currency:selectedCurrency
    }).format(amount);
}
dashboardIncome.textContent=formatCurrency(totalIncome);
dashboardExpenses.textContent=formatCurrency(totalExpenses);
dashboardBalance.textContent=formatCurrency(availableBalance);

const recentTransactionTable=document.getElementById("dashboard-recent-transactions");
function displayRecentTransactions(){
    const recentTransactions =[...transactions]
    .sort(function(a,b){
        return new Date(b.date)-new Date(a.date);
    })
    .slice(0,5);
    recentTransactionTable.innerHTML="";
    recentTransactions.forEach(function(transaction){
        const row=document.createElement("tr");
        const typeClass=transaction.type==="income"
        ? "income"
        :"expense";
        const icon=transaction.type==="income"? "fa-arrow-up-long":"fa-arrow-down-long";
        const sign=transaction.type==="income"? "+": "-";
        const formattedDate=new Date(transaction.date+"T00:00:00").toLocaleDateString("en-US",{
            month:"short",
            day:"2-digit",
            year:"numeric"
        });
        const typeCell=document.createElement("td");
        const iconSpan=document.createElement("span");
        iconSpan.className=`transaction-icon ${typeClass}`;
        const iconElement=document.createElement("i");
        iconElement.className=`fa-solid ${icon}`;
        iconSpan.appendChild(iconElement);
        typeCell.appendChild(iconSpan);
        const categoryCell=document.createElement("td");
        categoryCell.textContent=transaction.category.charAt(0).toUpperCase()+transaction.category.slice(1);
        const descriptionCell=document.createElement("td");
        descriptionCell.textContent=transaction.description;
        const dateCell=document.createElement("td");
        dateCell.textContent=formattedDate;
        const amountCell=document.createElement("td");
        amountCell.className= `${typeClass}-text`;
        amountCell.textContent= `${sign}${formatCurrency(transaction.amount)}`;
        const actionsCell=document.createElement("td");
        actionsCell.textContent="--";
        row.append(
            typeCell,
            categoryCell,
            descriptionCell,
            dateCell,
            amountCell,
            actionsCell
        );
        recentTransactionTable.appendChild(row);
    });
}
displayRecentTransactions();

const dashboardAddButton=document.querySelector(".add-transaction-button");
dashboardAddButton.addEventListener("click",function(){
    window.location.href="transactions.html?add=true";
});
const expenseTransactions=transactions.filter(function(transaction){
    return transaction.type==="expense";
});
const categoryTotals={};
expenseTransactions.forEach(function(transaction){
    if(categoryTotals[transaction.category]){
        categoryTotals[transaction.category]+=transaction.amount;
    }
    else{
        categoryTotals[transaction.category]=transaction.amount;
    }
});
const categories=Object.keys(categoryTotals);
const categoryAmounts=Object.values(categoryTotals).map(function(amount){
    return convertAmount(amount);
});
const expenseChart=document.getElementById("expense-category-chart");
if(expenseChart&& categories.length>0){
    new Chart(expenseChart,{
        type:"pie",
        data:{
            labels:categories,
            datasets:[{
                data:categoryAmounts,
                backgroundColor:[
                    "#9250c4",
                    "#f4a261",
                    "#2a9d8f",
                    "#e76f51",
                    "#457b9d",
                    "#e9c46a"
                ],
                borderWidth:2,
                borderColor:"#ffffff"
            }]
        },
        options:{
            responsive:true,
            maintainAspectRatio:false,
            plugins:{
                legend:{
                    position:"bottom"
                },
                tooltip:{
                    callbacks:{
                        label:function(context){
                            return context.label+":"+formatConvertedAmount(context.raw);
                        }
                    }
                }
            }
        }
    });
}

const incomeExpenseChart=document.getElementById("income-expense-chart");
if(incomeExpenseChart){
    new Chart(incomeExpenseChart,{
        type:"bar",
        data:{
            labels:["Income","Expenses"],
            datasets:[{
                label:`Amount (${localStorage.getItem("cashlyCurrency")||"KES"})`,
                data:[
                    convertAmount(totalIncome),
                    convertAmount(totalExpenses)],
                backgroundColor:[
                     "#2a9d8f",
                    "#e76f51"
                ],
                borderRadius:8,
                barThickness:60
            }]
        },
        options:{
            responsive:true,
            maintainAspectRatio:false,
            plugins:{
                legend:{
                    display:false
                },
                tooltip:{
                    callbacks:{
                        label:function(context){
                            return formatConvertedAmount(context.raw);
                        }
                    }
                }
            },
            scales:{
                y:{
                    beginAtZero:true
                }
            }
        }
    });
}

window.addEventListener("currencyRatesUpdated",function(){
    location.reload();
});