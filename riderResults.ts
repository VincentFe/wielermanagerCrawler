import { list } from "firebase/storage";
import { Race, isEqualRace } from "./race";

export class RiderResults {

    rider: string;
    year: number;
    results?: [Race];

    constructor(rider: string, year: number, results?: [Race]) {
        this.rider = rider;
        this.year = year;
        this.results = results;
    }
}

export class Rider {

    rider: string;
    results?: [RiderResults];

    constructor(rider: string, results?: [RiderResults]) {
        this.rider = rider;
        this.results = results;
    }
}

export class EvaluateRiders {

    rider_names: [string];
    riders: [Rider];
    race_years: [RacesInYear];

    constructor(riders: [Rider]) {
        let riy: RacesInYear = new RacesInYear(0);
        this.race_years = [riy];
        this.race_years.pop();
        this.riders = riders;
        this.rider_names = [""];
        this.rider_names.pop();
        let max_year: number = 0;
        let min_years: number = 3000;
        for (let rider of riders) {
            this.rider_names.push(rider.rider);
            if (rider.results === undefined) {
                break;
            }
            for (let results of rider.results) {
                if (results.year > max_year) {
                    max_year = results.year;
                }
                if (results.year < min_years) {
                    min_years = results.year;
                }
            }
        }
        for (let y = max_year; y >= min_years; y--) {
            let racesInYear = new RacesInYear(y);
            for (let rider of riders) {
                if (rider.results === undefined) {
                    break;
                }
                for (let results of rider.results) {
                    if (results.year === y && results.results !== undefined) {
                        racesInYear.pushRaces(results.results);
                    }
                }
            }
            this.race_years.push(racesInYear);
        }
    }

    getRaceYears(): [RacesInYear] {
        return this.race_years;
    }

    getSubset(rider_names: [string]) {
        let dummy: Rider = {rider : "" };
        let new_riders: [Rider] = [dummy];
        new_riders.pop();
        for (let check of this.riders) {
            if (rider_names.includes(check.rider)) {
                new_riders.push(check);
            }
        }
        return new EvaluateRiders(new_riders);
    }

}

export class RacesInYear {

    year: number;
    races: [[Race]];

    constructor(year: number) {
        this.year = year;
        let dummy: Race = {rider: "", name: ""};
        this.races = [[dummy]];
        this.races.pop();
    }

    getYear(): number {return this.year};

    getRaces(): [[Race]] {return this.races};

    pushRaces(racesToAdd: [Race]) {
        for (let race of racesToAdd) {
            for (let i = 0; i < this.races.length; i ++) {
                if (isEqualRace(this.races[i][0], race)) {
                    let tmp = this.races[i];
                    tmp.push(race);
                    this.races = this.races.slice(0, i).concat(this.races.slice(i+1)) as [[Race]];
                    this.races.push(tmp);
                }
            }
            this.races.push([race]);
        }
    }

    getRacesRiddenTogether(amount?: number): [[Race]] {
        if (amount === undefined) {
            return this.races;
        }
        let dummy: Race = {rider: "", name: ""};
        let result: [[Race ]] = [[dummy]];
        result.pop();
        for (let check of this.races) {
            if (check.length >= amount) {
                result.push(check);
            }
        }
        return result;
    }
}