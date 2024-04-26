import { Race, StageRace, OneDayRace, UnfinishedResult } from "./race";
import { EvaluateRiders } from "./riderResults";

export class TableParser {

    data: EvaluateRiders;
    riders: [string];

    constructor(data: EvaluateRiders, riders: [string]) {
        this.data = data;
        this.riders = riders;
    }

    format_to_table() {
        let sorted_riders = this.riders.sort();
        let tabledata: [[string]] = [[""]];
        tabledata.pop();
        let header: [string] = [""];
        for (let r of sorted_riders) {
            header.push(r);
        }
        let width: number = header.length;
        tabledata.push(header);

        for (let race_years of this.data.getRaceYears()) {

            let year: number = race_years.getYear();
            let year_line: [string] = ["     " + year.toString()];
            for (let i = 0; i < width - 1; i++) {
                year_line.push("");
            }
            tabledata.push(year_line);
            let results: [[Race]] = race_years.getRaces();
            for (let race_results of results) {
                let isStageRace: boolean;
                if (this.instanceOfStageRace(race_results[0])) {
                    isStageRace = true;
                }
                else {
                    isStageRace = false;
                }
                if (isStageRace) {
                    let lines = this.fillStageRace(header, race_results);

                    for (let line of lines) {
                        tabledata.push(line);
                    }

                }
                else {
                    let line: [string] = this.fillOneDayRace(header, race_results);
                    tabledata.push(line);
                }
                
            }

        }

        return tabledata;
    }

    private fillStageRace(header: [string], race_results: [Race]): [[string]] {
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
    
        let race_days: [[OneDayRace]] = this.format_race_days(race_results);
        //Race days
        for (let raceDay of race_days) {
            let raceLine = this.fillOneDayRace(header, raceDay);
            result.push(raceLine);
        }
    
        return result;
    }

    private fillOneDayRace(header: [string], race_results: [Race]): [string] {
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
                    if (r.result === UnfinishedResult.DNF) {
                        line.push("DNF");
                    }
                    else if (r.result === UnfinishedResult.DNS) {
                        line.push("DNS");
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

    private instanceOfStageRace(object: Race): boolean {
        return ('race_days' in object);
    }
    
    private format_race_days(results: [Race]): [[OneDayRace]] {
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
}