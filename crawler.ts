import * as fs from 'fs';
import * as xlsx from 'xlsx';
import axios from 'axios';
import { BlobOptions } from 'buffer';


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
    result: number | string;
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
    let position: string | number;
    let pos: string = tmp[1].substring(4);
    if (tmp[1].substring(4) === "DNS") {
        position = "DNS";
    }
    else if (tmp[1].substring(4) === "DNF") {
        position = "DNF";
    }
    else {
        position = parseInt(pos);
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
    stage_list.pop();

    for (let leg of stages.slice(1)) {
        if (leg[22] === "<") {
            let tmp = leg.substring(31);
            let pos: string = tmp.split("<")[0];
            let position: string | number;
            if (pos === "DNF") {
                position = "DNF";
            }
            else if (pos === "DNS") {
                position = "DNS";
            }
            else {
                position = parseInt(pos);
            }
            if (leg.includes("Mountains classification")) {
                if (!Number.isNaN(position)) {
                    mountains = position as number;
                }
            }
            else if (leg.includes("Points classification")) {
                if (!Number.isNaN(position)) {
                    points = position as number;
                }
            }
            else if (leg.includes("General classification")) {
                if (!Number.isNaN(position)) {
                    gc = position as number;
                }
            }
            else if (leg.includes("Youth classification")) {
                if (!Number.isNaN(position)) {
                    youth = position as number;
                }
            }
            else {
                console.log("\nERROR at: " + leg + "\n");
            }
        }
        else {
            let tmp = leg.split("</td>")
            let date_length = tmp[0].length;
            let one_day_date = tmp[0].substring(date_length - 5);
            let pos: string = tmp[1].substring(4);
            let position: string | number;
            if (pos === "DNF" || pos === "DNS") {
                position = pos;
            }
            else {
                position = parseInt(pos);
            }

            let tmp_name = tmp[4].split("</a>");
            let one_day_name_split = tmp_name[0].split(">");
            let one_day_name = one_day_name_split[one_day_name_split.length - 1].replace("&rsaquo;", "->");

            let one_day: OneDayRace = { rider: rider_name, name: one_day_name, date: one_day_date, result: position};
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
    races_ridden.pop();

    if (list.length === 0) {
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
                races_ridden.push(race);
            }
            else {
                let race: Race = parse_stage_race(stage_race_items, rider); 
                races_ridden.push(race); 
            }          
        }

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
async function rider_results(name: string, period: number): Promise<[RiderResults]> {
    let dummyRace: Race = {rider: "dummy", name: "dummy"};
    let dummy: RiderResults = {year: 2025, rider: name, results: [dummyRace] };
    dummy.results?.pop();
    let all_results: [RiderResults] = [dummy];
    all_results.pop();
    for  (let y = 2024; y > period; y--) {
        let url = source_url + "rider/" + name + "/" + y ;
        const data: void | [Race] = await fetchPage(url, name);
        if (data instanceof Object) {
            let results: RiderResults = { rider: name, year: y, results: data};
            all_results.push(results);            
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
    result.pop();
    for (let y of years) {
        let r: Race = {name: "dummy", rider: "dummy"};
        let races_in_year: [[Race]] = [[r]];
        races_in_year.pop();
        for (let tmp of data) {
            if (tmp[0] === y) {
                races_in_year.push(tmp[1]);
            }
        }
        result.push([y, races_in_year]);
    }
    return result;
}


function export_to_excel(data: [[number, [Race]]], outputFilePath: string) {
    let formatted_data = split_per_year(data);
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
async function crawl(riders: [string], period: number): Promise<[[RiderResults]]> {
    let dummy: [RiderResults] = [{rider: "dummy", year: 2025}];
    let all_results: [[RiderResults]] = [dummy];
    all_results.pop();
    for (let rider of riders) {
        let results: [RiderResults] = await rider_results(rider, period);
        all_results.push(results);
        
    }

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
async function evaluate_riders(riders: [string], filename: string, period: number) {
    let dummy: Race = {rider: "dummy", name: "dummy"};
    let ridden_together: [[number, [Race]]] = [[0, [dummy]]];
    ridden_together.pop();
    let rider_results: [[RiderResults]] = await crawl(riders, period);
    for (let y = 2024; y > (2024 - rider_results[0].length); y--) {
        //let dummy: Race = {name: "dummy"};
        let races_ridden: [Race] = [dummy];
        races_ridden.pop();
        for (let rider_years of rider_results) {
            for (let rider of rider_years) {
                if (rider.year === y) {
                    let results: [Race] = rider.results as [Race];
                    for (let result of results) {
                        let tmp = race_in_ridden(result, races_ridden);
                        let inridden: Boolean = tmp[0];
                        if (inridden) {
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
    write_to_file(ridden_together, filename, riders);
}


function instanceOfStageRace(object: Race): boolean {
    return ('race_days' in object);
}

function format_to_table(data: [[number, [[Race]]]], riders: [string]): [[string]] {
    let sorted_riders = riders.sort();
    let tabledata: [[string]] = [[""]];
    tabledata.pop();
    let header: [string] = [""];
    for (let r of sorted_riders) {
        header.push(r);
    }
    let width: number = header.length;
    tabledata.push(header);

    for (let year_results of data) {
        let year: number = year_results[0];
        let year_line: [string] = ["     " + year.toString()];
        for (let i = 0; i < width - 1; i++) {
            year_line.push("");
        }
        tabledata.push(year_line);
        let results: [[Race]] = year_results[1];
        for (let race_results of results) {
            let isStageRace: boolean;
            if (instanceOfStageRace(race_results[0])) {
                isStageRace = true;
            }
            else {
                isStageRace = false;
            }
            if (isStageRace) {
                let lines = fillStageRace(header, race_results);

                for (let line of lines) {
                    tabledata.push(line);
                }

            }
            else {
                let line: [string] = fillOneDayRace(header, race_results);
                tabledata.push(line);
            }
            
        }

    }

    return tabledata;
}

function fillStageRace(header: [string], race_results: [Race]): [[string]] {
    let result: [[string]] = [[""]];
    result.pop();
    let name: string = race_results[0].name;
    // Init GC
    let test: StageRace = race_results[0] as StageRace;
    if (test.gc_result !== undefined) {
        let gc_line: [string] = [name + " GC"];
        for (let i = 1; i < header.length; i++) {
            let isEmpty: boolean = true;
            for (let race of race_results) {
                let r = race as StageRace;
                if (header[i] === r.rider && r.gc_result !== undefined) {
                    let position = r.gc_result as number;
                    gc_line.push(position.toString());
                    isEmpty = false;
                }
            }
            if (isEmpty) {
                gc_line.push("");
            }
        }
        result.push(gc_line);
    }
            
    // Init points
    if (test.points_result !== undefined) {
        let points_line: [string] = [name + " points"];
        for (let i = 1; i < header.length; i++) {
            let isEmpty: boolean = true;
            for (let race of race_results) {
                let r = race as StageRace;
                if (header[i] === r.rider && r.points_result !== undefined) {
                    let position = r.points_result as number;
                    points_line.push(position.toString());
                    isEmpty = false;
                }
            }
            if (isEmpty) {
                points_line.push("");
            }
        }
        result.push(points_line);
    }

    //Init mountains
    if (test.mountains_result !== undefined) {
        let mountains_line: [string] = [name + " mountains"];
        for (let i = 1; i < header.length; i++) {
            let isEmpty: boolean = true;
            for (let race of race_results) {
                let r = race as StageRace;
                if (header[i] === r.rider && r.mountains_result !== undefined) {
                    let position = r.mountains_result as number;
                    mountains_line.push(position.toString());
                    isEmpty = false;
                }
            }
            if (isEmpty) {
                mountains_line.push("");
            }
        }
        result.push(mountains_line);
    }

    //Init youth
    let needed: boolean = false;
    let youth_line: [string] = [name + " youth"];
    for (let i = 1; i < header.length; i++) {
        let isEmpty: boolean = true;
        for (let race of race_results) {
            let r = race as StageRace;
            if (r.youth_result !== undefined && header[i] === r.rider) {
                let position = r.youth_result as number;
                youth_line.push(position.toString());
                isEmpty = false;
                needed = true;
            }
        }
        if (isEmpty) {
            youth_line.push("");
        }
    }
    if (needed) {
        result.push(youth_line);
    }

    let race_days: [[OneDayRace]] = format_race_days(race_results);
    //Race days
    for (let raceDay of race_days) {
        let raceLine = fillOneDayRace(header, raceDay);
        result.push(raceLine);
    }

    return result;
}

    function format_race_days(results: [Race]): [[OneDayRace]] {
        let races: [StageRace] = results as [StageRace];
        let dummy: OneDayRace = {name: "dummy", date: "", result: 0, rider: ""};
        let result: [[OneDayRace]] = [[dummy]];
        result.pop();
        let nr_of_stages: number = Infinity;
        for (let r of races) {
            let check: number = r.race_days.length;
            if (check < nr_of_stages) {
                nr_of_stages = check;
            }
        }
        for (let i = 0; i < nr_of_stages; i++) {
            let tmp: [OneDayRace] = [dummy];
            tmp.pop();
            for (let race of races) {
                let stages = race.race_days;
                let len = stages.length;
                tmp.push(stages[len - 1 - i]);
            }
            result.push(tmp);
        }
        return result;
    }


function fillOneDayRace(header: [string], race_results: [Race]): [string] {
    let line: [string];
    if (race_results[0].type === undefined) {
        line = [race_results[0].name];
    }
    else {
        line = [race_results[0].name + " " + race_results[0].type];
    }
    for (let i = 1; i < header.length; i++) {
        let isEmpty: boolean = true;
        for (let race of race_results) {
            let r = race as OneDayRace;
            if (header[i] === r.rider) {
                if (r.result === "DNF" || r.result === "DNS") {
                    line.push(r.result);
                }
                else {
                    line.push(r.result.toString());
                }
                isEmpty = false;
            }
        }
        if (isEmpty) {
            line.push("");
        }
    }
    return line;
}

function write_to_file(data: [[number, [Race]]], outputFilePath: string, riders: [string]) {
    let formatted_year_data = split_per_year(data);
    let tableData: [[string]] = format_to_table(formatted_year_data, riders);
    const table = require('table').table;
    let output = table(tableData);
    console.log(output);

    fs.writeFile(outputFilePath, output,"utf8", function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

}

function format_riders(names: [string]): [[string], [string]] {
    let little: [string] = [""];
    let abbreviations: [string] = [""];
    little.pop()
    abbreviations.pop();
    for (let name of names) {
        let searchname: string = "";
        let words = name.split(" ");
        for (let t of words) {
            t = t.toLowerCase();
            searchname += t + "-";
        }
        searchname = searchname.slice(0, (searchname.length - 1));
        little.push(searchname);
        let tmp: [string] = name.toLowerCase().split(" ") as [string];
        let abb: string = "";
        for (let t of tmp) {
            abb += t.slice(0,1);
        }
        abbreviations.push(abb);
    }
    return [little, abbreviations];
}

const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');

const rl = readline.createInterface({ input, output });

function main() {
    console.log("Welkom bij mijn super coole automatische analyse voor de wielermanager! :))");

    rl.question('Voer renners in die je wil vergelijken, gescheiden door een komma. Stoppen doe je door op enter te duwen. \n> ', (a: string) => {
        let answer: string = a;
        let riders: [[string],[string]] = format_riders(answer.split(", ") as [string]);
        let filename: string = "";
        for (let l of riders[1]) {
            filename += l + "-"
        }
        let len = filename.length;
        filename = filename.slice(0,len-1);
        filename += ".txt"
        evaluate_riders(riders[0], filename, 2005);
        rl.close();
    });

   

    


}

main();

const source_url: string = "https://www.procyclingstats.com/"
/*
let riders: [string] = ["remco-evenepoel"];
riders.push("vito-braet");
//let riders: [string] = ["wout-van-aert"];
riders.push("arnaud-de-lie", "oier-lazkano");
//evaluate_riders(riders);
*/