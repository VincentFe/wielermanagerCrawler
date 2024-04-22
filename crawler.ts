import * as fs from 'fs';
import * as xlsx from 'xlsx';
import axios from 'axios';

// Interface to represent a race
interface Race {
    rider: string;
    name: string;
    type? : string;
}

// Interface to represent a stage race which is a subset of a race and (normally) consists of more than 1 one day race
interface StageRace extends Race {
    date: string[];
    gc_result?: number;
    points_result? : number;
    mountains_result? : number;
    youth_result? : number;
    race_days: [OneDayRace];
}

// Interface to represent a one day race which is a subset of a race
interface OneDayRace extends Race {
    date: string;
    result: number | String;
}

// Function to issue a get request to the url in the parameter. It will call another function to parse the returned html (as a string) to a list of races
async function fetchPage(url: string, rider: string): Promise< void | [Race]> {
    const AxiosInstance = axios.create(); // Create a new Axios Instance

    // Send an async HTTP Get request to the url
    let races = AxiosInstance.get(url)
        .then( // Once we have data returned ...
            response => {
            const html = response.data; // Get the HTML from the HTTP request
            let ridden_races = parse_html(html, rider);
            return ridden_races;
            }
        )
        .catch(console.error); // Error handling
    
        //const HTMLData = axios

    return races;
}

// Function to parse an html string into a one day race
function parse_oneday_race(stage: string, rider_name: string): OneDayRace {
    let tmp = stage.split("</td>")
    let date_length = tmp[0].length;
    let one_day_date = tmp[0].substring(date_length - 5);
    let position: number | String = parseInt(tmp[1].substring(4));
    if (Number.isNaN(position)) {
        if (tmp[1].substring(4) === "DNS") {
            position = "DNS";
        }
        else if (tmp[1].substring(4) === "DNF") {
            position = "DNF";
        }
        else {
            console.log("Invalid position error");
        }
    }

    let tmp_name = tmp[4].split("</a>");
    let one_day_name_split = tmp_name[0].split(">");
    let one_day_name = one_day_name_split[one_day_name_split.length - 3].split(" <")[0].replace("&rsaquo;", "->");

    let race_type = one_day_name_split[one_day_name_split.length - 2].split("<")[0];

    let one_day: OneDayRace = { rider: rider_name, name: one_day_name, type: race_type, date: one_day_date, result: position};

    return one_day;
}

// Function to parse a list of html strings into a stage race
function parse_stage_race(stages: [string], rider_name: string): StageRace {
    let tour_info = stages[0];

    // Parse the date
    let getDate = tour_info.split(" ");
    let date1 = getDate[1].split("d>")[1];
    let date2 = getDate[3].substring(0,5);
    let date = [date1, date2];

    // Parse the name
    let getName = tour_info.split("name")
    let tmp = getName[1].split(" <span>")
    let tmp_name = tmp[0].split(">")
    let race_name = tmp_name[tmp_name.length - 1]

    // Parse the type of the race
    let race_type = tmp[1].substring(1).split(")")[0]

    let mountains: number | undefined = undefined;
    let gc: number | undefined = undefined;
    let points: number | undefined = undefined;
    let youth: number | undefined = undefined;

    let tmp_race: OneDayRace = {rider: "dummy", name: "dummy", date: "2025", result: -1};
    let stage_list: [OneDayRace] = [tmp_race];

    for (let leg of stages.slice(1)) {
        if (leg[22] === "<") {
            let tmp = leg.substring(31);
            let position = parseInt(tmp.split("<")[0]);
            if (leg.includes("Mountains classification")) {
                mountains = position;
            }
            else if (leg.includes("Points classification")) {
                points = position;
            }
            else if (leg.includes("General classification")) {
                gc = position;
            }
            else if (leg.includes("Youth classification")) {
                youth = position;
            }
            else {
                console.log("\nERROR at: " + leg + "\n");
            }
        }
        else {
            let tmp = leg.split("</td>")
            let date_length = tmp[0].length;
            let one_day_date = tmp[0].substring(date_length - 5);
            let position = parseInt(tmp[1].substring(4));

            let tmp_name = tmp[4].split("</a>");
            let one_day_name_split = tmp_name[0].split(">");
            let one_day_name = one_day_name_split[one_day_name_split.length - 1].replace("&rsaquo;", "->");

            let one_day: OneDayRace = { rider: rider_name, name: one_day_name, date: one_day_date, result: position};

            if (stage_list[0].name === "dummy" && stage_list.length === 1) {
                stage_list.pop();
            }
            else if (stage_list[0].name === "dummy") {
                console.log("Error")
            }
            stage_list.push(one_day);
        }
    }

    let stage_race: StageRace;
    // Initialize the object
    if (points === undefined && mountains === undefined && youth === undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, race_days: stage_list};
    }
    else if (points === undefined && mountains === undefined && youth !== undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, youth_result: youth, race_days: stage_list};
    }
    else if (points === undefined && mountains !== undefined && youth === undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, mountains_result: mountains, race_days: stage_list};
    }
    else if (points !== undefined && mountains === undefined && youth === undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, points_result: points, race_days: stage_list};
    }
    else if (points === undefined && mountains !== undefined && youth !== undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, mountains_result: mountains, youth_result: youth, race_days: stage_list};
    }
    else if (points !== undefined && mountains === undefined && youth !== undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, points_result: points, youth_result: youth, race_days: stage_list};
    }
    else if (points !== undefined && mountains !== undefined && youth === undefined) {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, points_result: points, mountains_result: mountains, race_days: stage_list};
    }
    else {
        stage_race = { rider: rider_name, name: race_name, date: date, type: race_type, gc_result: gc, points_result: points, mountains_result: mountains, youth_result: youth, race_days: stage_list};
    }
    return stage_race;
}

// Function to parse an html page into a list of races
function parse_html(page: any, rider: string): [Race] {
    let str: string = page.toString();
    let split = str.split('<table');
    let table = split[1].split('</table')
    let tmp = table[0].split('<tbody>')
    let data = tmp[1].split('</tbody>')
    let list = data[0].split('\n').splice(1);

    let dummy: Race = {rider: "dummy", name: "dummy"};
    let races_ridden: [Race] = [dummy];

    if (list.length == 0) {
        races_ridden.pop();
        return races_ridden;
    }

    for (let item of list) {
        if (item[15] === "1") {
            let stage_race_items: [string] = [item];
            list = list.slice(1);
            for (let stage of list) {
                if (stage[15] === "0") {
                    stage_race_items.push(stage)
                }
                else {
                    list = list.slice(stage_race_items.length - 1);
                    break;
                }
            }
            if (stage_race_items.length === 1) {
                let race: Race = parse_oneday_race(stage_race_items[0], rider);
                if (races_ridden[0].name === "dummy" && races_ridden.length === 1) {
                    races_ridden.pop();
                }
                races_ridden.push(race);
            }
            else {
                let race: Race = parse_stage_race(stage_race_items, rider); 
                if (races_ridden[0].name === "dummy" && races_ridden.length === 1) {
                    races_ridden.pop();
                }
                races_ridden.push(race); 
            }          
        }
        /*
        else {
            console.log("\nERROR AT: " + item + "\n")
        }
        */
    }

    return races_ridden;
}

// Interface to represent the results a rider has ridden during a race
interface RiderResults {
    rider: String;
    year: number;
    results?: [Race];
}

// Funtion to get and format all the races a given rider has ridden during it's career
async function rider_results(name: string): Promise<[RiderResults]> {
    let dummyRace: Race = {rider: "dummy", name: "dummy"};
    let dummy: RiderResults = {year: 2025, rider: name, results: [dummyRace] };
    let all_results: [RiderResults] = [dummy];
    for  (let y = 2024; y > 2021; y--) {
        let url = source_url + "rider/" + name + "/" + y ;
        const data: void | [Race] = await fetchPage(url, name);
        if (data instanceof Object) {
            let results: RiderResults = { rider: name, year: y, results: data};
            let check = results.results as [Race];
            if (check[0].name === "dummy") {
                continue;
            }
            else {
                if (all_results[0].year === 2025) {
                    all_results.pop();
                }
                all_results.push(results);
            }
            
        }
        else {
            let results: RiderResults = {year: y, rider: name};
            all_results.push(results);
        }
    }

    return all_results;
}

function convert_to_json(data: [[Race]]): any[] {
    let json: any[] = [];
    for (let r of data) {
        json.push(r);
    }
    return json;
}

function split_per_year(data: [[number, [Race]]]): [[number, [[Race]]]] {
    let years: [number] = [0];
    for (let d of data) {
        if (!years.includes(d[0])) {
            if (years.length === 1 && years[0] === 0) {
                years.pop();
            }
            years.push(d[0]);
        }
    }
    let dummy: Race = {name: "dummy", rider: "dummy"};
    let result: [[number, [[Race]]]] = [[0, [[dummy]]]];
    for (let y of years) {
        let r: Race = {name: "dummy", rider: "dummy"};
        let races_in_year: [[Race]] = [[r]];
        for (let tmp of data) {
            if (tmp[0] === y) {
                if (races_in_year.length === 1 && races_in_year[0][0].name === "dummy") {
                    races_in_year.pop();
                }
                races_in_year.push(tmp[1]);
            }
        }
        if (result.length === 1 && result[0][0] === 0 && result[0][1][0][0].name === "dummy" ) {
            result.pop()
        }
        result.push([y, races_in_year]);
    }
    return result;
}


function export_to_excel(data: [[number, [Race]]], outputFilePath: string) {
    let formatted_data = split_per_year(data);
    console.log(formatted_data.length);
    const workbook = xlsx.utils.book_new();
    for (let i = 0; i < formatted_data.length; i++) {
        let year: number = formatted_data[i][0];
        //let jsonData: any[] = JSON.parse(data[i][1]) as any[];
        let jsonData: any[] = convert_to_json(formatted_data[i][1]);
        const sheet = xlsx.utils.json_to_sheet(jsonData);
        xlsx.utils.book_append_sheet(workbook, sheet, "Year: " + year.toString());
    }
    
    xlsx.writeFile(workbook, outputFilePath);
    
}

// Function to crawl over all the requested riders and return their results
async function crawl(riders: [string]): Promise<[[RiderResults]]> {
    let dummy: [RiderResults] = [{rider: "dummy", year: 2025}];
    let all_results: [[RiderResults]] = [dummy];
    for (let rider of riders) {
        let results: [RiderResults] = await rider_results(rider);
        if (all_results[0][0].rider == "dummy") {
            all_results.pop()
        }
        all_results.push(results);
        
    }

    //console.log(all_results)

    return all_results;
}

// Helper function to check weather the given race is already in the other ridden races
function race_in_ridden(race: Race, ridden: [Race]): [boolean, Race | undefined] {
    let race_name = race.name;
    let race_type = race.type;
    for (let r of ridden) {
        if (r.name === race_name && r.type === race_type) {
            return [true, r];
        }
    }
    return [false, undefined];
}

function check_together(race: Race, others: [Race]): boolean {
    let result: boolean = false;
    for (let r of others) {
        if (race.name === r.name && race.type === r.type && race.rider !== r.rider) {
            result = true;
        }
        else {
            return false;
        }
    }
    return result;
}

function race_in_together(race: Race, together: [[number, [Race]]]): [boolean, [[number, [Race]]] | undefined] {
    let len: number = together.length;
    for (let i = 0; i < len; i++) {
        let current = together[i];
        let check = check_together(race, current[1]);
        if (check) {
            let result: [[number, [Race]]] = together.splice(0, i).concat(together.splice(i+1)) as [[number, [Race]]];
            current[1].push(race);
            result.push(current);
            return [true, result];
        }
    }


    return [false, undefined];
}

// Function to evaluate the riders that have ridden races together in the same years
async function evaluate_riders(riders: [string]) {
    let dummy: Race = {rider: "dummy", name: "dummy"};
    let ridden_together: [[number, [Race]]] = [[0, [dummy]]];
    let rider_results: [[RiderResults]] = await crawl(riders);
    for (let y = 2024; y > (2024 - rider_results[0].length); y--) {
        //let dummy: Race = {name: "dummy"};
        let races_ridden: [Race] = [dummy];
        for (let rider_years of rider_results) {
            for (let rider of rider_years) {
                if (rider.year === y) {
                    if (races_ridden.length === 1 && races_ridden[0].name === "dummy") {
                        races_ridden.pop()
                    }
                    let results: [Race] = rider.results as [Race];
                    for (let result of results) {
                        let tmp = race_in_ridden(result, races_ridden);
                        let inridden: Boolean = tmp[0];
                        if (inridden) {
                            if (ridden_together.length === 1 && ridden_together[0][0] === 0 && ridden_together[0][1][0].name === "dummy") {
                                ridden_together.pop();
                            }
                            let intogether = race_in_together(result, ridden_together);
                            if (intogether[0]) {
                                ridden_together = intogether[1] as [[number, [Race]]];
                            }
                            else {
                                let together = tmp[1] as Race;
                                let new_list: [Race] = [together];
                                new_list.push(result);
                                ridden_together.push([y, new_list]);
                            } 
                        }
                        races_ridden.push(result);
                    }
                }
            }
        }
    }
    export_to_excel(ridden_together, 'test.xlsx');
}







let source_url: string = "https://www.procyclingstats.com/"
//let riders: [string] = ["remco-evenepoel"];
//riders.push("vito-braet", "lars-boven");
let riders: [string] = ["wout-van-aert"];
riders.push("arnaud-de-lie", "oier-lazkano");
//crawl(riders);
evaluate_riders(riders);
