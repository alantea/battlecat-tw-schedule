<template>
  <div id="app">
    <div>
      統帥值: 
      <input
        type="text"
        v-model="maxLife"
      >
    </div>
    <div>
      Max columns: 
      <input
        type="text"
        v-model="maxCol"
      >
    </div>
    <br>

    <textarea
      v-model="message"
      placeholder="add multiple lines"
    >
    </textarea>
    <br>
    <button
      @click="generate"
    >
      Generate
    </button>

    <hr>

    <table>
      <thead>
        <tr>
          <td>
            <b>
            活動
            </b>
          </td>
          <td>
            <b>
              時間
            </b>
          </td>
          <td
            v-for="titleIdx in maxCol"
            :key="titleIdx"
          >
            <b>
              {{ titleIdx }} 回體力
            </b>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in scheduleList"
          :key="idx"
        >
          <td
            v-if="row.title"
            :rowspan="row.count"
          >
          <b>
            <span
              v-if="row.nodb"
            >
              {{ row.name }}
            </span>
            <a
              v-else
              :href="row.nameLink"
              target="_blank"
            >
              {{ row.name }}
            </a>
          </b>
          </td>
          <td>
            <a
              :href="row.startLink"
              target="_blank"
            >
            {{ row.startTime }}
            </a>
          </td>
          <td
            v-for="(event, eidx) in row.list"
            :key="'event' + eidx"
          >
            <a
              :href="event.link"
              target="_blank"
            >
              {{ event.time }}
            </a>
          </td>
          <td
            v-for="(space, sidx) in ((maxCol - row.list.length) > 0 ? maxCol - row.list.length : 0)"
            :key="'space' + sidx"
          >
          </td>
        </tr>
      </tbody>
    </table>

  </div>
</template>

<script>

function toNumber(str) {
  if(typeof str === "number") {
    return str;
  }
  else {
    return parseInt(str, 10);
  }
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
Date.prototype.addMinutes = function(minutes) {
    var date = new Date(this.valueOf());
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    return date;
}
Date.prototype.setCatTime = function(time) {
    // 0000, 2400
    var date = new Date(this.valueOf());
    var rdate = new Date(
      date.getFullYear() + "-" +
      ("00" + (date.getMonth()+1)).slice(-2) + "-" +
      ("00" + date.getDate()).slice(-2) + "T" +
      time.slice(0,2) + ":" +
      time.slice(2,4)
    );
    return rdate;
}
Date.prototype.setCatDay = function(day) {
    var date = new Date(this.valueOf());
    let rmonth = date.getMonth()+1;
    if(toNumber(day) < date.getDate()) {
      rmonth++;
    }

    var rdate = new Date(
      date.getFullYear() + "-" +
      ("00" + rmonth).slice(-2) + "-" +
      ("00" + day).slice(-2) + "T" +
      "00:00"
    );
    return rdate;
}

const axios = require('axios').default;

export default {
  name: 'App',
  data: function () {
    return {
      maxLife: 1050,
      maxCol: 0,
      message: "",
      scheduleList: [],
      stages: "",
    }
  },
  methods: {
    generate() {
      this.scheduleList = [];
      let data = this.message.split("\n");
      this.maxCol  = 0;
      let result = [];

      // Generate data
      for (let i = 0; i < data.length; i++) {
        const row = data[i].split("\t");
        let colIdx = 0;
        let timeList = [];

        if(row.length < 10) {
          continue;
        }

        // Datetime
        const startDate = this.formatToDate(row[colIdx], row[colIdx+1]);
        colIdx += 2;
        const endDate = this.formatToDate(row[colIdx], row[colIdx+1]);
        colIdx += 2;

        // Unused
        // 100500 999999 0
        colIdx += 3;
        
        // 1: Every day
        // >1: Multiple schedule and day
        // 0: once
        if(row[colIdx] == "1") {
          // 1 0 0 0
          colIdx += 4;

          // times a b a b a b
          let times = toNumber(row[colIdx])*2;
          colIdx += 1;

          for (let j = startDate; j < endDate; j = j.addDays(1)) {
            for (let k = 0; k < times; k+=2) {
              const tmpStartTime = ("0000" + row[colIdx+k]).slice(-4);
              const tmpEndTime = ("0000" + row[colIdx+k+1]).slice(-4);
              timeList.push({
                start: j.setCatTime(tmpStartTime),
                end: j.setCatTime(tmpEndTime),
              });
            }
          }
          colIdx += times;

          // event ev1 ev2 ev3
          let events = toNumber(row[colIdx]);
          colIdx += 1;

          for (let j = 0; j < events; j++) {
            // Check event exists
            const findEvent = result.find(event => event.id == row[colIdx + j]);
            if(typeof findEvent !== "undefined") {
              findEvent.list = findEvent.list.concat(timeList);
            }
            else {
              result.push({
                id: row[colIdx + j],
                list: Object.assign([], timeList),
              });
            }
          }

        }
        else if(toNumber(row[colIdx]) > 1){
          // schedules
          const schedules = toNumber(row[colIdx]);
          colIdx += 1;

          for (let j = 0; j < schedules; j++) {
            // 0 dateCount d1 d2 d3 ...
            colIdx += 1;
            const dateCount = toNumber(row[colIdx]);
            let tmpDateList = [];
            let tmpTimeList = [];
            colIdx += 1;
            for (let k = 0; k < dateCount; k++) {
              tmpDateList.push(startDate.setCatDay(row[colIdx+k]));
            }
            colIdx += dateCount;

            // 0 times a b a b
            colIdx += 1;
            const timeCount = toNumber(row[colIdx]);
            colIdx += 1;
            for (let k = 0; k < timeCount; k+=2) {
              const tmpStartTime = ("0000" + row[colIdx+k]).slice(-4);
              const tmpEndTime = ("0000" + row[colIdx+k+1]).slice(-4);
              for (let m = 0; m < dateCount; m++) {
                let tmpTime = tmpDateList[m].setCatTime(tmpStartTime);
                if(tmpTime.valueOf() >= startDate.valueOf() && tmpTime.valueOf() <= endDate.valueOf()) {
                  tmpTimeList.push({
                    start: tmpTime,
                    end: tmpTime.setCatTime(tmpEndTime),
                  });
                }
              }
            }
            colIdx += timeCount*2;
            timeList = timeList.concat(tmpTimeList);
          }

          // Sort
          timeList.sort(function(a, b) {
            return a.start.valueOf() - b.start.valueOf();
          });

          // event ev1 ev2 ev3
          let events = toNumber(row[colIdx]);
          colIdx += 1;

          for (let j = 0; j < events; j++) {
            // Check event exists
            const findEvent = result.find(event => event.id == row[colIdx + j]);
            if(typeof findEvent !== "undefined") {
              findEvent.list = findEvent.list.concat(timeList);
            }
            else {
              result.push({
                id: row[colIdx + j],
                list: Object.assign([], timeList),
              });
            }
          }
          
        }
        else if(row[colIdx] == "0") {
          // 0
          colIdx += 1;

          timeList.push({
            start: startDate,
            end: endDate,
          });

          // event ev1 ev2 ev3
          let events = toNumber(row[colIdx]);
          colIdx += 1;

          for (let j = 0; j < events; j++) {
            // Check event exists
            const findEvent = result.find(event => event.id == row[colIdx + j]);
            if(typeof findEvent !== "undefined") {
              findEvent.list = findEvent.list.concat(timeList);
            }
            else {
              result.push({
                id: row[colIdx + j],
                list: Object.assign([], timeList),
              });
            }
          }
        }
      }

      for (let i = 0; i < result.length; i++) {
        const event = result[i];
        let stage = this.stages.find(e => e.id == event.id);
        if(typeof stage === "undefined") {
          stage = {id: event.id, value: 999999, max: 0, name: "未定義活動"};
        }
        const battledbLink = (typeof stage.nodb === "boolean" && stage.nodb ? "" : "https://battlecats-db.com/stage/s"+("00000" + event.id).slice(-5)+".html");

        for (let j = 0; j < event.list.length; j++) {
          const schedule = event.list[j].start;
          let eventStartStr = schedule.toISOString().replace(/-/g, "").replace(".000", "").replace(/:/g, "");
          let eventEndStr = event.list[j].end.toISOString().replace(/-/g, "").replace(".000", "").replace(/:/g, "");
          const tmpEventTime = ("00"+schedule.getHours()).slice(-2)+":"+("00"+schedule.getMinutes()).slice(-2);
          
          let obj = {
            startTime: `${schedule.getFullYear()}/${schedule.getMonth()+1}/${schedule.getDate()} ${tmpEventTime}`,
            startLink: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=貓戰-${stage.name}&dates=${eventStartStr}/${eventEndStr}&details=${battledbLink}`,
            list: [],
          }
          if(j == 0) {
            obj.title = true;
            obj.name = stage.name;
            obj.count = event.list.length;
            obj.nameLink = battledbLink;
            obj.nodb = (typeof stage.nodb === "boolean" ? stage.nodb : false);
          }

          for (let m = 1; this.maxLife - stage.value * m >= 0 && (stage.max == 0 || m - 1 < stage.max); m++) {
            let eventTime = schedule.addMinutes((stage.value * m * -1 / 2));
            let eventTimeStr = eventTime.toISOString().replace(/-/g, "").replace(".000", "").replace(/:/g, "");
            let tmpEvent = {
              time: "",
              link: "",
            };
            tmpEvent.time = `${eventTime.getHours()}:${eventTime.getMinutes()}`
            tmpEvent.link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=貓戰儲存體力-${stage.name}&dates=${eventTimeStr}/${eventTimeStr}&details=${battledbLink}`
            obj.list.push(tmpEvent);

            if(this.maxCol < m) {
              this.maxCol  = m;
            } 
          }

          this.scheduleList.push(obj);
        }
      }

    },
    formatToDate(day, time) {
      let tmpTime = ("0000" + time).slice(-4);
      return new Date(
        day.slice(0,4) + "-" +
        day.slice(4,6) + "-" +
        day.slice(6,8) + "T" +
        tmpTime.slice(0,2) + ":" +
        tmpTime.slice(2,4)
      );
    }
  },
  mounted () {
    axios.get("data/event.json")
      .then( (response) => {
        this.stages = response.data;
      })
      .catch(function (error) {
        // alert("Get events error");
        console.log(error);
      });
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
textarea {
    min-height: 200px;
    min-width: 400px;
}

table {
  border-collapse: collapse;
}
table td, table th {
  border: 1px solid #000;
  padding: 4px;
}
</style>
