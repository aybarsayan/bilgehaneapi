const promptGenerator = require("./prompter")


const data = {
    "value": {
        "id": "5712c0a2-9802-4a39-9e50-9bdfb721a211",
        "sessionId": "eb92b3d4-c278-49ff-9d2b-c57ec9005ab3",
        "analyzeType": "Upper",
        "analyzeSideType": "Back",
        "date": "2024-07-08T10:27:56.997025",
        "thermalAnalyzeData": [
            {
                "id": "1b075c32-3880-40f7-a3d2-782942ad5a7a",
                "muscleType": "Gluteal",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.075,
                "leftBodyTemperature": {
                    "max": 34.578,
                    "min": 23.538,
                    "mean": 33.186
                },
                "rightBodyTemperature": {
                    "max": 34.863,
                    "min": 26.148,
                    "mean": 33.111
                }
            },
            {
                "id": "288a6df4-c6b3-4191-a4b2-ad6ae11bdee9",
                "muscleType": "RotatorCuff",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Urgent",
                "disability": "Normal",
                "temperatureDiff": 0.213,
                "leftBodyTemperature": {
                    "max": 34.535,
                    "min": 22.818,
                    "mean": 33.531
                },
                "rightBodyTemperature": {
                    "max": 34.925,
                    "min": 21.008,
                    "mean": 33.744
                }
            },
            {
                "id": "30a4edd1-4efe-4832-a2fe-131cb2ad84a3",
                "muscleType": "Lumbar",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "ShouldProtect",
                "temperatureDiff": 0.794,
                "leftBodyTemperature": {
                    "max": 33.638,
                    "min": 28.781,
                    "mean": 32.674
                },
                "rightBodyTemperature": {
                    "max": 33.453,
                    "min": 27.67,
                    "mean": 31.88
                }
            },
            {
                "id": "4bf48904-8a9f-4a51-92d1-15fbc8b6c572",
                "muscleType": "Trapeze",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.034,
                "leftBodyTemperature": {
                    "max": 35.621,
                    "min": 23.136,
                    "mean": 34.686
                },
                "rightBodyTemperature": {
                    "max": 35.621,
                    "min": 24.708,
                    "mean": 34.652
                }
            },
            {
                "id": "6ca016c2-bd69-4c68-8dc2-53c9a6026c42",
                "muscleType": "Cervical",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.034,
                "leftBodyTemperature": {
                    "max": 34.636,
                    "min": 22.818,
                    "mean": 33.204
                },
                "rightBodyTemperature": {
                    "max": 34.8,
                    "min": 21.008,
                    "mean": 33.238
                }
            },
            {
                "id": "8946c449-3cd0-45c4-9d50-4b05e11a07d3",
                "muscleType": "Carpel",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Urgent",
                "temperatureDiff": 2.334,
                "leftBodyTemperature": {
                    "max": 32.817,
                    "min": 25.53,
                    "mean": 31.383
                },
                "rightBodyTemperature": {
                    "max": 30.792,
                    "min": 24.634,
                    "mean": 29.049
                }
            },
            {
                "id": "905210e9-0e44-49d5-966e-8e874f8b2c44",
                "muscleType": "Triceps",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.163,
                "leftBodyTemperature": {
                    "max": 33.652,
                    "min": 22.818,
                    "mean": 31.976
                },
                "rightBodyTemperature": {
                    "max": 33.555,
                    "min": 21.008,
                    "mean": 32.139
                }
            },
            {
                "id": "93d07227-2e97-474e-9514-9f829433b607",
                "muscleType": "Olecranon",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.11,
                "leftBodyTemperature": {
                    "max": 32.939,
                    "min": 31.082,
                    "mean": 32.131
                },
                "rightBodyTemperature": {
                    "max": 33.336,
                    "min": 28.194,
                    "mean": 32.021
                }
            },
            {
                "id": "a11bd98c-3476-4dd5-b800-4cd938ecade9",
                "muscleType": "Flexor",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "ShouldObserve",
                "temperatureDiff": 0.549,
                "leftBodyTemperature": {
                    "max": 33.155,
                    "min": 25.53,
                    "mean": 32.279
                },
                "rightBodyTemperature": {
                    "max": 33.521,
                    "min": 25.541,
                    "mean": 31.73
                }
            },
            {
                "id": "ce4aecac-256c-4e2b-ab5c-3b408777011c",
                "muscleType": "Extansor",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.236,
                "leftBodyTemperature": {
                    "max": 32.988,
                    "min": 27.531,
                    "mean": 31.612
                },
                "rightBodyTemperature": {
                    "max": 33.336,
                    "min": 21.402,
                    "mean": 31.376
                }
            },
            {
                "id": "dfe189f4-0f47-4896-8afd-352d0054088e",
                "muscleType": "Deltoid",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Normal",
                "temperatureDiff": 0.071,
                "leftBodyTemperature": {
                    "max": 35.291,
                    "min": 29.955,
                    "mean": 33.736
                },
                "rightBodyTemperature": {
                    "max": 35.199,
                    "min": 33.042,
                    "mean": 33.807
                }
            },
            {
                "id": "fe06a39e-a29b-4cc5-8f35-3755fa82ceb7",
                "muscleType": "Hand",
                "date": "2024-07-08T10:27:56.997025",
                "tiredness": "Normal",
                "disability": "Urgent",
                "temperatureDiff": 2.263,
                "leftBodyTemperature": {
                    "max": 31.742,
                    "min": 19.51,
                    "mean": 28.803
                },
                "rightBodyTemperature": {
                    "max": 30.297,
                    "min": 19.041,
                    "mean": 26.54
                }
            }
        ],
        "athlete": {
            "id": "e1e0bfea-ab3b-410c-9358-74fe232251de",
            "positionName": "LM",
            "profile": "",
            "timestamp": "2024-07-06T15:14:05.673853Z",
            "name": "Marco",
            "surname": "Reus",
            "nationality": "Germany",
            "jerseyNumber": 123,
            "birthDate": "1988-11-10T22:00:00",
            "bodySize": {
                "height": 188.00,
                "weight": 88.00
            },
            "salary": 123123123.00,
            "teamId": "4918bfd9-eb1e-4f0f-a60e-1fefac754c7e",
            "gender": "Man",
            "dominantSide": "Left"
        },
        "injuryImageUrl": "https://ai4sports-thermal.s3.amazonaws.com/2024-07-08_13-28-51__upper_injury_image.png",
        "tirednessImageUrl": "https://ai4sports-thermal.s3.amazonaws.com/2024-07-08_13-28-50__upper_fatique_image.png",
        "createdOnUtc": "2024-07-08T10:28:53.468985Z"
    },
    "error": {
        "code": "",
        "message": ""
    },
    "isSuccess": true
}

const prompt = promptGenerator(data.value)

console.log(prompt);