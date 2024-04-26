
export class Race {
    
    rider: string;
    name: string;
    type? : string | undefined;

    constructor(rider: string, name: string, type?: string) {
        this.rider = rider;
        this.name = name;
        this.type = type;
    }
}

export function isEqualRace(one: Object, other: Object): boolean {
    if (other instanceof Race && one instanceof Race) {
        return (other.name === one.name && other.type !== undefined && one.type !== undefined && one.type === other.type);
    }
    return false;
}

export function isIn(r: Race, races: [Race]): [boolean, Race | undefined] {
    for (let check of races) {
        if (isEqualRace(r, check)) {
            return [true, check];
        }
    }
    return [false , undefined];
}

export class StageRace extends Race {

    date: string[];
    gc_result?: number;
    points_result? : number;
    mountains_result? : number;
    youth_result? : number;
    race_days: [OneDayRace];

    constructor(rider: string, name: string, type: string, date: string[], gc: number, points: number, mountains: number, youth: number, stages: [OneDayRace]) {
        super(rider, name, type);

        this.gc_result = gc;
        this.date = date;
        this.points_result = points;
        this.mountains_result = mountains;
        this.race_days = stages;
        this.youth_result = youth;
    }
}

export class OneDayRace extends Race {

    date: string;
    result: number | UnfinishedResult;

    constructor(rider: string, name: string, type: string, date: string, result: number | UnfinishedResult) {
        super(rider, name, type);
        this.date = date;
        this.result = result;
    }
    
}

export enum UnfinishedResult {DNF, DNS}