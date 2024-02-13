const myMap = d3.select("#myMap");
const treeMap = d3.select("#treeMap");
const lineChart = d3.select("#lineChart");

const width = myMap.node().getBoundingClientRect().width;
const height = myMap.node().getBoundingClientRect().height;

const treeMapWidth = treeMap.node().getBoundingClientRect().width;
const treeMapHeight = treeMap.node().getBoundingClientRect().height;

const margin = { top: 20, right: 30, bottom: 30, left: 100 };
const lineChartWidth = lineChart.node().getBoundingClientRect().width - margin.left - margin.right;
const lineChartHeight = lineChart.node().getBoundingClientRect().height - margin.top - margin.bottom;

var days = 200;
var x, y, xAxis, yAxis, line, path;

const continentColors = ["#ff8c00", "#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c"];
const continentColorScale = d3.scaleOrdinal()
    .domain(["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "Antarctica"])
    .range(continentColors);

var projection = d3.geoNaturalEarth1()
                   .scale(250)
                   .translate([width, height])
                   .fitSize([width, height], world);
var path = d3.geoPath().projection(projection);
var colorScale = d3.scaleSequential(customInterpolator).domain([0,5000000]);

var currentDataType = "total_cases";
var currentContinent = "All";
var currentISO = "CHN";

var playing = false;
var timer;
var startDate = new Date("2020-02-24");
var daysSinceStart = 0;
var dateString

var mapByDate;
var world;
var dataFields = {
    'total_cases_per_million': '每百万人总感染人数: ',
    'new_cases_per_million': '每百万人新增感染人数: ',
    'total_deaths_per_million': '每百万人总死亡人数: ',
    'new_deaths_per_million': '每百万人新增死亡人数: ',
    'reproduction_rate': '传染率: ',
    'icu_patients': '重症监护病人数: ',
    'icu_patients_per_million': '每百万人重症监护病人数: ',
    'hosp_patients': '医院治疗病人数: ',
    'hosp_patients_per_million': '每百万人医院治疗病人数: ',
    'weekly_icu_admissions': '每周重症监护病人入院数: ',
    'weekly_icu_admissions_per_million': '每百万人每周重症监护病人入院数: ',
    'weekly_hosp_admissions': '每周医院病人入院数: ',
    'weekly_hosp_admissions_per_million': '每百万人每周医院病人入院数: ',
    'total_tests': '总检测数: ',
    'new_tests': '新增检测数: ',
    'total_tests_per_thousand': '每千人总检测数: ',
    'new_tests_per_thousand': '每千人新增检测数: ',
    'positive_rate': '阳性率: ',
    'tests_per_case': '每例病例检测数: ',
    'tests_units': '检测单位: ',
    'total_vaccinations': '总疫苗接种数: ',
    'people_vaccinated': '接种疫苗人数: ',
    'people_fully_vaccinated': '完全接种疫苗人数: ',
    'total_boosters': '加强针接种数: ',
    'new_vaccinations': '新增疫苗接种数: ',
    'total_vaccinations_per_hundred': '每百人总疫苗接种数: ',
    'people_vaccinated_per_hundred': '每百人接种疫苗数: ',
    'people_fully_vaccinated_per_hundred': '每百人完全接种疫苗数: ',
    'total_boosters_per_hundred': '每百人加强针接种数: ',
    'stringency_index': '防疫严格程度指数: ',
    'population_density': '人口密度: ',
    'aged_65_older': '65岁以上人口比例: ',
    'aged_70_older': '70岁以上人口比例: ',
    'gdp_per_capita': '人均GDP: ',
    'extreme_poverty': '极端贫困率: ',
    'cardiovasc_death_rate': '心血管疾病死亡率: ',
    'diabetes_prevalence': '糖尿病患病率: ',
    'female_smokers': '女性吸烟者比例: ',
    'male_smokers': '男性吸烟者比例: ',
    'handwashing_facilities': '洗手设施普及率: ',
    'hospital_beds_per_thousand': '每千人医院床位数: ',
    'life_expectancy': '预期寿命: ',
    'human_development_index': '人类发展指数: ',
    'population': '人口: ',
    'excess_mortality_cumulative_absolute': '累计超额死亡人数: ',
    'excess_mortality_cumulative': '累计超额死亡率: ',
    'excess_mortality': '超额死亡: ',
    'excess_mortality_cumulative_per_million': '每百万人累计超额死亡率: '
};

function customInterpolator(t) {;
    if(currentDataType  === "total_vaccinations_per_hundred" 
    || currentDataType  === "stringency_index"
    ||currentDataType === "hospital_beds_per_thousand"){
        return d3.interpolateRgbBasis(["#3bo000", "red", "#00FF00"])(t);
    }else{
        return d3.interpolateRgbBasis(["#008000", "red", "#3b0000"])(t);
    }
    //return d3.interpolateRgb("#008000", "#FF0000")(t);
}

function updateCurrentDateString(){
    var currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + parseInt(daysSinceStart));
    dateString = currentDate.toISOString().slice(0, 10);
}

function updateMapColor() {
    var currentData = mapByDate.get(dateString);
    myMap.selectAll(".country")
        .attr("fill", function(d) {
            var isoCode = d.properties.ISO_A3;
            var countryData = currentData.get(isoCode);
            if (countryData && countryData.hasOwnProperty(currentDataType)) {
                var cases = countryData[currentDataType];
                return colorScale(cases);
            } else {
                return "#000000";
            }
        });
}

function updateLegend() {
    myMap.selectAll(".legend").remove();
    var legend = myMap.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20,20)");
    var legendWidth = 300;
    var legendHeight = 20;
    legend.selectAll("rect")
        .data(d3.range(legendWidth), function(d) { return d; })
        .enter().append("rect")
        .attr("x", function(d, i) { return i; })
        .attr("width", 2)
        .attr("height", legendHeight)
        .style("fill", function(d, i) { 
            return colorScale(d * (colorScale.domain()[1] / legendWidth)); 
        });
    var xScale = d3.scaleLinear()
        .range([0, legendWidth])
        .domain(colorScale.domain());
    var axis = d3.axisBottom(xScale).ticks(5);
    legend.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + legendHeight + ")")
        .call(axis);
}

function updateMap() {
    var filteredData = currentContinent === "All" ? world.features : world.features.filter(function(d) {
        return d.properties.continent === currentContinent;
    });
    var countries = myMap.selectAll(".country")
        .data(filteredData);
    countries.enter().append("path")
        .attr("class", "country")
        .merge(countries)
        .attr("d", path);
    countries.exit().remove();
    updateMapColor(d3.select("#timeSlider").property("value"));
    myMap.selectAll(".country")
        .on("click", function(event, d) {
            currentISO = d.properties.ISO_A3;
            updateDetailedData();
            updateFlagandContry();
            updateLineChart();
        });
}

function updateProjection(continent) {
    var center, scale, projectionType, rotation;
    switch (continent) {
        case 'Africa':
            center = [20, 5];
            scale =300;
            rotation = [0, 0];
            projectionType = d3.geoMercator;
            break;
        case 'Asia':
            center = [-15, 30];
            scale = 300;
            rotation = [-100, 0];
            projectionType = d3.geoMercator;
            break;
        case 'South America':
            center = [0, -20];
            scale = 300;
            rotation = [60, 0];
            projectionType = d3.geoMercator;
            break;
        case 'Europe':
            center = [30, 60];
            scale = 400;
            rotation = [0, 0];
            projectionType = d3.geoMercator;
            break;
        case 'North America':
            center = [0, 35];
            scale = 400;
            rotation = [100, 0];
            projectionType = d3.geoEqualEarth;
            break;
        case 'Oceania':
            center = [150,-30];
            scale = 400;
            rotation = [0,0];
            projectionType = d3.geoMercator;
            break;
        default:
            center = [10, 30];
            scale = 170;
            rotation = [0, 0];
            projectionType = d3.geoNaturalEarth1;
            break;
    }
    projection = projectionType()
                    .scale(scale)
                    .center(center)
                    .rotate(rotation)
                    .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);
}

function updateFlagandContry() {
    var countryName = "";
    var ISO_A2 = "";

    world.features.forEach(function(feature) {
        if (feature.properties.ISO_A3 === currentISO) {
            countryName = feature.properties.ADMIN;
            ISO_A2 = feature.properties.ISO_A2;
        }
    });

    document.getElementById("countryName").innerText = countryName;
    var flagFilePath = `./flags/${ISO_A2.toLowerCase()}.png`;
    document.getElementById("countryFlag").src = flagFilePath;
}

function updateDetailedData() {
    var currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + daysSinceStart);
    var dataForDate = mapByDate.get(currentDate.toISOString().split('T')[0]);

    if (dataForDate.has(currentISO)) {
        var data = dataForDate.get(currentISO);
        for (var field in dataFields) {
            var text = dataFields[field] + (data[field] !== undefined ? data[field] : "无数据");
            document.getElementById(field).innerText = text;
        }
    } else {
        for (var field in dataFields) {
            document.getElementById(field).innerText = dataFields[field] + "无数据";
        }
    }
}

function createTreeMap() {
    if (!mapByDate.has(dateString)) {
        console.log("没有找到日期对应的数据: ", dateString);
        return;
    }
    const dataForDate = mapByDate.get(dateString);
    let treeData = { name: "Root", children: [] };
    let continents = {};
    world.features.forEach(function(country) {
        let isoCode = country.properties.ISO_A3;
        let continent = country.properties.continent;
        if (currentContinent === "All" || continent === currentContinent) {
            let countryData = dataForDate.get(isoCode);
            if (countryData && countryData.hasOwnProperty(currentDataType)) {
                if (!continents[continent]) {
                    continents[continent] = { name: continent, children: [] };
                }
                continents[continent].children.push({ 
                    name: country.properties.ADMIN,
                    value: countryData[currentDataType],
                    ISO: country.properties.ISO_A3
                });
            }
        }
    });
    Object.values(continents).forEach(continent => treeData.children.push(continent));
    const root = d3.hierarchy(treeData).sum(d => d.value);
    d3.treemap()
        .tile(d3.treemapSquarify)
        .size([treeMapWidth, treeMapHeight])
        .padding(1)
        (root);
    const nodes = treeMap.selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);
    nodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => {
            let parentName = d.parent.data.name;
            return continentColorScale(parentName);
        })
        .on("click", function(event, d) {
            currentISO = d.data.ISO;
            updateDetailedData();
            updateFlagandContry();
            updateLineChart();
        });
    nodes.append("text")
    .attr("x", 5)
    .attr("y", 20)
    .text(d => d.data.name)
    .style("font-size", d => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        let fontSize = Math.min(rectWidth / 5, rectHeight / 2);
        fontSize = Math.min(fontSize, 16);
        return `${fontSize}px`;
    })
    .attr("visibility", d => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        return rectWidth > 30 && rectHeight > 20 ? "visible" : "hidden";
    });
}
function updateTreeMapLegend() {
    const legendData = continentColorScale.domain().map(continent => ({
        continent: continent,
        color: continentColorScale(continent)
    }));
    let legend = d3.select("#treeMapLegend");
    if (legend.empty()) {
        legend = d3.select("#visualization").append('div')
            .attr('id', 'legend');
    }
    legend.selectAll('div').remove();
    legend.selectAll('div')
        .data(legendData)
        .enter().append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin-bottom', '5px')
        .each(function(d) {
            d3.select(this).append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background-color', d.color);
            d3.select(this).append('span')
                .text(d.continent)
                .style('margin-left', '5px');
        });
}

function updateTreeMap() {
    treeMap.selectAll("g").remove();
    createTreeMap();
}
function updateLineChart() {
    lineChart.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    lineChart.selectAll("*").remove();
    x = d3.scaleTime().range([0, lineChartWidth]);
    y = d3.scaleLinear().range([lineChartHeight, 0]);
    xAxis = lineChart.append("g").attr("transform", `translate(0,${lineChartHeight})`);
    yAxis = lineChart.append("g");
    line = d3.line().x(d => x(new Date(d.date))).y(d => y(d.value));
    path = lineChart.append("path")
              .attr("class", "lineChartPath")
              .attr("fill", "none")
              .attr("stroke", "steelblue")
              .attr("stroke-width", 1.5);
    let data = [];
    let endDate = new Date(dateString);
    let startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days);
    for (let d = 0; d <= days; d++) {
        let date = new Date(startDate);
        date.setDate(startDate.getDate() + d);
        let dateString = date.toISOString().split('T')[0];
        if (mapByDate.has(dateString)) {
            let dayData = mapByDate.get(dateString).get(currentISO);
            if (dayData && !isNaN(dayData[currentDataType])) {
                data.push({ date: dateString, value: dayData[currentDataType] });
            }
        }
    }
    x.domain(d3.extent(data, d => new Date(d.date)));
    y.domain([0, d3.max(data, d => d.value)]);
    xAxis.call(d3.axisBottom(x));
    yAxis.call(d3.axisRight(y));
    path.datum(data)
        .attr("d", line);
}
function updateDay(){
    updateCurrentDateString();
    updateMapColor();
    updateDetailedData();
    updateTreeMap();
    updateLineChart();
    var currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + daysSinceStart);
    d3.select("#currentDate").text(currentDate.toISOString().slice(0, 10));
};

function startPlaying() {
    d3.select("#playButton").text("Pause");

    timer = setInterval(function() {
        var slider = d3.select("#timeSlider");
        daysSinceStart = Number(slider.property("value"));

        if (daysSinceStart < slider.attr("max")) {
            slider.property("value", daysSinceStart + 1);
            updateDay();
        } else {
            stopPlaying();
        }
    }, 10);

    playing = true;
}

function stopPlaying() {
    playing = false;
    clearInterval(timer);

    d3.select("#playButton").text("Play");
}

d3.select("#dataSelect").on("change", function() {
    currentDataType = this.value;
    if (currentDataType === "total_cases") {
        colorScale.domain([0, 5000000]);
    } else if (currentDataType === "total_cases_per_million") {
        colorScale.domain([0, 10000]);
    } else if (currentDataType === "new_cases_smoothed") {
        colorScale.domain([0, 10000]);
    } else if (currentDataType === "new_cases_smoothed_per_million") {
        colorScale.domain([0, 2000]);
    } else if (currentDataType === "total_deaths") {
        colorScale.domain([0, 500000]);
    } else if (currentDataType === "total_deaths_per_million") {
        colorScale.domain([0, 5000]);
    } else if (currentDataType === "new_deaths_smoothed") {
        colorScale.domain([0, 500]);
    } else if (currentDataType === "new_deaths_smoothed_per_million") {
        colorScale.domain([0, 50]);
    } else if (currentDataType === "icu_patients") {
        colorScale.domain([0, 10000]);
    } else if (currentDataType === "hosp_patients") {
        colorScale.domain([0, 30000]);
    } else if (currentDataType === "weekly_icu_admissions") {
        colorScale.domain([0, 1000]);
    } else if (currentDataType === "hospital_beds_per_thousand") {
        colorScale.domain([0, 10]);
    } else if (currentDataType === "reproduction_rate") {
        colorScale.domain([0, 20]);
    } else if (currentDataType === "positive_rate") {
        colorScale.domain([0, 0.5]);
    } else if (currentDataType === "tests_per_case") {
        colorScale.domain([0, 1000]);
    } else if (currentDataType === "total_vaccinations_per_hundred") {
        colorScale.domain([0, 200]);
    } else if (currentDataType === "stringency_index") {
        colorScale.domain([0, 100]);
    } else if (currentDataType === "aged_70_older") {
        colorScale.domain([0, 10]);
    } else {
        colorScale.domain([0, 10000]);
    }
    updateMapColor(d3.select("#timeSlider").property("value"));
    updateLegend(); 
    updateLineChart();
    updateTreeMap();
});

d3.select("#continentSelect").on("change", function() {
    currentContinent = this.value;
    updateProjection(currentContinent);
    updateMap(); 
    updateTreeMap();
});

d3.select("#daysInput").on("change", function() {
    days = this.value;
    updateLegend();
})

d3.select("#timeSlider").on("input", function() {
    daysSinceStart = Number(this.value);
    stopPlaying();
    updateDay();
});

d3.select("#playButton").on("click", function() {
    if (playing) {
        stopPlaying();
    } else {
        startPlaying();
    }
});

function draggable(element) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.button == 1) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

draggable(document.getElementById("controlpannel"));


Promise.all([
    d3.json("./countries.geojson"),
    d3.csv("./owid-covid-data-old.csv")
]).then(function([worldData, covidData]) {
    world = worldData;
    mapByDate = new Map();
    var continentByIso = new Map();
    covidData.forEach(function(row) {
        continentByIso.set(row.iso_code, row.continent);
    });
    worldData.features.forEach(function(country) {
        var isoCode = country.properties.ISO_A3;
        country.properties.continent = continentByIso.get(isoCode);
    });
    covidData.forEach(function(row) {
        let date = row.date;
        let isoCode = row.iso_code;
        if (!mapByDate.has(date)) {
            mapByDate.set(date, new Map());
        }
        let mapByCountry = mapByDate.get(date);
        if (!mapByCountry.has(isoCode)) {
            mapByCountry.set(isoCode, {});
        }
        let dataForCountry = mapByCountry.get(isoCode);
        for (let key in row) {
            if (row.hasOwnProperty(key)) {dataForCountry[key] = row[key] === "" ? undefined : isNaN(row[key]) ? row[key] : +row[key];
            }
        }
    });
    covidData = null;
    updateProjection(currentContinent);
    updateFlagandContry();
    updateLegend();
    updateCurrentDateString();
    updateDetailedData();
    updateMap(); 
    createTreeMap();
    updateTreeMapLegend();
    updateLineChart();
    var result = window.confirm("数据可视化实验5。\n左侧为详细数据展示框，右上分别为疫情信息树图与疫情信息地图，右下为疫情信息折线图。\n左上角控制台可以由鼠标中键点击拖动，地图与树图均可点击，以此在折线图和数据展示框中显示对应国家的信息。通过控制台可以进行丰富的交互。按下play与pause按钮可以开始与暂停动画。时间滑条可以鼠标左键拖动。折线图天数代表疫情信息折线图的时间跨度\n疫情数据信息、geojson数据信息、国旗数据信息均来自于GitHub，仅作学习交流展示目的，不代表作者本人政治观点。");
}).catch(function(error) {
    console.log("加载数据时出错：", error);
});
//作者：张明昆
//感谢您的阅读