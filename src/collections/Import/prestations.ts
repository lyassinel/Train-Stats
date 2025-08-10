export const textToPrestations = (data: string) => {
    const separateur = '____________________________________________________________________________________________________'; // adapte selon ton besoin
    const content = data
    const result = content.split(separateur)
        .map(e => e.trim())
        .filter(e => e !== '');;

    return result
}

export const decoupeTachesPrestation = (taches: string) => {
    const separateur = /\d{2}.\d{2}-\d{2}.\d{2} *\d{0,4}/;
    const regex = new RegExp(`(${separateur.source})`, 'g');
    const parts = taches.split(regex).filter(e => e.trim() !== '');

    const result = [];
    for (let i = 0; i < parts.length; i++) {
        // Si c'est un séparateur (il matche le regex), on l'ajoute à la fin de l'élément précédent
        if (separateur.test(parts[i]) && i > 0) {
            result[result.length - 1] += parts[i];
        } else if (!separateur.test(parts[i])) {
            result.push(parts[i]);
        }
        // Remet le curseur du regex à zéro pour éviter les problèmes avec .test() sur regex global
        separateur.lastIndex = 0;
    }
    return result;
}

export const additionnerHeures = (heureDebut: string, minutesDebut: string, heureFin: string, minutesFin: string) => {
    let result = 0;
    if (heureDebut > heureFin) {
        const horaireDebut =
            Number(heureDebut) * 60 + Number(minutesDebut)
        const horaireFin =
            (Number(heureFin) + 24) * 60 + Number(minutesFin)
        result = horaireFin - horaireDebut
    } else {
        const horaireDebut =
            Number(heureDebut) * 60 + Number(minutesDebut)
        const horaireFin =
            Number(heureFin) * 60 + Number(minutesFin)
        result = horaireFin - horaireDebut
    }
    return result
}