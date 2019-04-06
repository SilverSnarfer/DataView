let LEDGER_WINDOW = {
    initalQueryResults: new DocumentFragment(),
    filteredResults: new DocumentFragment(),
    filterInputs: {},

};

(function app() {
  
    initialize();

    //Initialization Process
    function initialize() {
        document.getElementById("filterOptions").querySelectorAll("input").forEach(option => {
            LEDGER_WINDOW.filterInputs[option.id] = option;
            LEDGER_WINDOW.filterInputs[option.id].addEventListener("input", handleFilterAction);
        });

        document.getElementById("selectSort").addEventListener("change", handleSortSelectAction);

        let loadedData = [];

        let data = new Promise((resolve, reject) => {
            setTimeout(() => {
                getDataFromAPI(resolve);
            }, 500);

        });

        data.then(queryResponse => {
            loadedData = queryResponse;
            initialTableFill(loadedData);
            document.getElementById("spinner").classList.add("hide");
            checkIfResultsEmpty();
            document.getElementById("selectSort").selectedIndex = 0;
        });
    }

    function getDataFromAPI(resolve) {
        fetch("http://127.0.0.1:8000/DataView.json")
            .then(res => res.json())
            .then(data => resolve(data.entries))
    }

    function createTableEntriesFromInitialQuery(data) {
        let entriesFragment = new DocumentFragment();
        let tbody = createTbody();
        
        data.forEach(obj => {
            let row = document.createElement("tr");
            row.setAttribute("incidentid", obj.incidentId);
            row.setAttribute("date", createUTCDate(obj.date));

            row.setAttribute("assigneeid", obj.assignee);
            row.setAttribute("priorityid", obj.priority);
            row.setAttribute("userid", obj.user);
            row.setAttribute("type", obj.type);
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    let td = document.createElement("td");
                    if (key == "date") {
                        td.append(document.createTextNode(  
                            new Date(Number.parseInt(row.getAttribute("date"))).toLocaleDateString("en-US", {
                                weekday: 'short',
                                year: 'numeric',
                                month: '2-digit',
                                day: 'numeric',
                                hour12: false,
                                hour:"2-digit",
                                minute: "2-digit"
                            })));
                    } else {
                        if (key == "description" || key == "solution" || key == "user" || key == "assignee" || key == "type") {
                             td.classList.add("removeable");
                        }
                        td.append(document.createTextNode(obj[key]));

                    }
                    
                    row.append(td);
                }
            }
            tbody.append(row);
        });

        entriesFragment.append(tbody);
        LEDGER_WINDOW.initalQueryResults = entriesFragment.cloneNode(true);
        LEDGER_WINDOW.filteredResults = entriesFragment.cloneNode(true);
        return entriesFragment;

    }
    function initialTableFill(data) {

        let table = document.getElementById("tableContent").parentNode;
        let tbody = document.getElementById("tableContent");
        table.replaceChild(createTableEntriesFromInitialQuery(data), tbody);
    }
    
    //Event handlers
    function handleFilterAction(e) {
        let table = document.getElementById("tableContent").parentNode;
        let tbody = document.getElementById("tableContent");
        LEDGER_WINDOW.filteredResults = filter(e);
        table.replaceChild(LEDGER_WINDOW.filteredResults.cloneNode(true), tbody);
        checkIfResultsEmpty();
    }

    function filter(e) {
        let frag = new DocumentFragment();
        let tbody = createTbody();
        
        let workingSet = getFilterWorkingSet();
        try {
            if ((e.inputType != "deleteContentForward" && e.inputType != "deleteContentBackward")) {
                workingSet.forEach(row => {
                    if (row.getAttribute(e.target.id).indexOf(e.target.value) != -1) {
                        tbody.append(row.cloneNode(true));
                    }
                });
            } else {
                workingSet.forEach(row => {
                    let matches = 0;
                    let filledInputs = 0;
                    for (const input of Object.keys(LEDGER_WINDOW.filterInputs)) {
                        if (LEDGER_WINDOW.filterInputs[input].value != "") {
                            filledInputs++;
                            if (row.getAttribute(LEDGER_WINDOW.filterInputs[input].id).indexOf(LEDGER_WINDOW.filterInputs[input].value) != -1) {
                                matches++;
                            }
                        }
                    }
                    if (matches == filledInputs) {
                        tbody.append(row.cloneNode(true));
                    }

                });
            }
        } catch (error) {
            let catchRow = document.createElement("tr");
            let catchData = document.createElement("td");
            catchData.append(document.createTextNode("error!"));
            catchRow.append(catchData);
            console.error("frag vs nodeList discrepency? ", error);
            tbody.append(catchRow);
        }

        frag.append(tbody);
        return frag;


        function getFilterWorkingSet() {

            if ((e.inputType != "deleteContentForward" && e.inputType != "deleteContentBackward")) {
                return LEDGER_WINDOW.filteredResults.cloneNode(true).firstChild.childNodes;
            } else {
                return LEDGER_WINDOW.initalQueryResults.cloneNode(true).firstChild.childNodes;
            }
        }
    }
    function handleSortSelectAction(e) {   
        console.log(`Proposed sort: ${e.target.value}\nCurrent sort: ${LEDGER_WINDOW.initalQueryResults.currentSort}`);
        if (LEDGER_WINDOW.initalQueryResults.currentSort != e.target.value || LEDGER_WINDOW.filteredResults.currentSort != event.target.value) {
            let table = document.getElementById("tableContent").parentNode;
            let tbody = document.getElementById("tableContent");
            LEDGER_WINDOW.initalQueryResults = sort(e.target.value, true);
            LEDGER_WINDOW.filteredResults = sort(e.target.value);

            LEDGER_WINDOW.initalQueryResults.currentSort = e.target.value;
            LEDGER_WINDOW.filteredResults.currentSort = e.target.value;
            table.replaceChild(LEDGER_WINDOW.filteredResults.cloneNode(true), tbody);
        } else {
            console.log(`No need to sort`);   
        }
        
    }
    
    function sort(sortCriteria, initialQueryResults = false) {
        let filterClone;

        if (initialQueryResults) {
            filterClone = LEDGER_WINDOW.initalQueryResults.firstChild.cloneNode(true).childNodes
        } else {
            filterClone = LEDGER_WINDOW.filteredResults.firstChild.cloneNode(true).childNodes
        }

        filterClone = Array.prototype.slice.call(filterClone,0);
        let frag = new DocumentFragment();
        let tbody = createTbody();
        
        let count = 1;
        while (count > 0) {
            let temp;
            count = 0;
            for (let index = 0; index < filterClone.length - 1; index++) {
                let rowA_Attribute;
                let rowB_Attribute;
                //bug fix #1
                if (sortCriteria == "date") {
                    rowA_Attribute = Number.parseInt(filterClone[index].getAttribute(sortCriteria));
                    rowB_Attribute = Number.parseInt(filterClone[index + 1].getAttribute(sortCriteria));
                } else {
                    rowA_Attribute = filterClone[index].getAttribute(sortCriteria).toUpperCase()
                    rowB_Attribute = filterClone[index + 1].getAttribute(sortCriteria).toUpperCase()
                }
                // **end bugfix #1**
                if (rowA_Attribute < rowB_Attribute) {
                    temp = filterClone[index].cloneNode(true);
                    filterClone[index] = filterClone[index+1].cloneNode(true);
                    filterClone[index +1] = temp.cloneNode(true);
                    count++;
                    
                }

            }
        }
        filterClone.forEach(node =>{
            tbody.append(node.cloneNode(true));
        })        
        frag.append(tbody);
        return frag;
   }

    //Utils
    function createTbody(){
        let tbody = document.createElement("tbody");
        tbody.setAttribute("id", "tableContent");
        tbody.classList.add("ldt-fade-in")
        return tbody
    }
    function createUTCDate(date) {
        let utc = date.split(" ");
        return Date.UTC(utc[0], utc[1], utc[2]);
    }
    function checkIfResultsEmpty() {
        let noResultsDiv = document.getElementById("emptyResults");

        if (LEDGER_WINDOW.filteredResults.firstChild.childElementCount == 0 || LEDGER_WINDOW.initalQueryResults.firstChild.childElementCount == 0) {
            if (noResultsDiv.classList.contains("hide")) {
                noResultsDiv.classList.toggle("hide");

                document.getElementById("selectSort").disabled = true;
            }
        } else {
            if (!noResultsDiv.classList.contains("hide")) {
                noResultsDiv.classList.toggle("hide");
                document.getElementById("selectSort").removeAttribute("disabled");
            }
        }
    }
})();

(function design() {
    console.log("here");
    
    document.getElementById("tableDiv").addEventListener("click", handleClick, true);
    document.getElementById("modal").addEventListener("click", handleModalClick, true);

    function handleClick(e) {
        if (e.target.parentNode.tagName.toLowerCase() != "tr" || e.target.tagName.toLowerCase() == "th") {
            
            
            return;
        }
        console.log(e); 
        document.getElementById("modal").style.display = "block";
        
    }

    function handleModalClick(e){
        if (e.target.className != "close") {
            return;
        } else {
            document.getElementById("modal").style.display = "none";
        }

    }
})();


