import { useEffect, useState } from 'react'
import axios from 'axios'
import { Box, Title, Tabs } from '@mantine/core'
import Division from './components/Division'
import Wildcard from './components/Wildcard'
import Conference from './components/Conference'
import League from './components/League'
import WinsAboveAvg from './components/WinsAboveAvg'
import Playoffs from './components/Playoffs'
import Stats from './components/Stats'
import NHL from './logos/NHL'

const API_URL = 'https://statsapi.web.nhl.com/api/v1'
const SEASON = '20212022'

/**
 * https://statsapi.web.nhl.com/api/v1/divisions
 * https://statsapi.web.nhl.com/api/v1/standings/byDivision
 * https://statsapi.web.nhl.com/api/v1/teams/
 */

const backgroundStyles = {
  position: 'absolute',
  top: '3em',
  left: 0,
  width: '100%',
  padding: '15rem 0 0 0',
  zIndex: -1,
  display: 'flex',
  justifyContent: 'center',
}

const App = () => {
  const [divisions, setDivsions] = useState([])
  const [conferences, setConferences] = useState([])
  const [standings, setStandings] = useState([])
  const [wildCard, setWildCard] = useState([])
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])

  useEffect(() => {
    axios.get(`${API_URL}/divisions`).then((res) => {
      const divisions = res.data.divisions.map((division) => ({
        value: division.id,
        label: division.name,
      }))
      setDivsions(divisions)
    })

    axios.get(`${API_URL}/conferences`).then((res) => {
      const conferences = res.data.conferences.map((conference) => ({
        value: conference.id,
        label: conference.name,
      }))
      setConferences(conferences)
    })

    axios('https://statsapi.web.nhl.com/api/v1/teams').then((res) => {
      setTeams(res.data.teams)
    })

    axios(`${API_URL}/schedule?season=${SEASON}&gameType=R`).then((res) => {
      setGames(res.data.dates)
    })

    axios(`${API_URL}/standings/wildCard`).then((res) => {
      setWildCard(res.data.records)
    })
  }, [])

  useEffect(() => {
    if (teams.length === 0 || wildCard.length === 0) return

    const divisionEliminated = (team, division) => {
      const gamesRemaining = 82 - team.gamesPlayed
      const possiblePts = team.points + gamesRemaining * 2
      const division3rd = division.teamRecords[2]

      if (possiblePts === division3rd.points) {
        const maxRegulationWins = gamesRemaining + team.regulationWins
        if (maxRegulationWins === division3rd.wins) {
          const maxRow = gamesRemaining + team.row
          return maxRow < division3rd.row
        }
        return maxRegulationWins < division3rd.wins
      }
      return possiblePts < division.teamRecords[2].points
    }

    const wildCardEliminated = (team, division) => {
      const gamesRemaining = 82 - team.gamesPlayed
      const possiblePts = team.points + gamesRemaining * 2
      const wc2 = wildCard.find(
        (d) => d.conference.id === division.conference.id
      ).teamRecords[1]

      if (possiblePts === wc2.points) {
        const maxRegulationWins = gamesRemaining + team.regulationWins
        if (maxRegulationWins === wc2.regulationWins) {
          const maxRow = gamesRemaining + team.row
          return maxRow < wc2.row
        }
        return maxRegulationWins < wc2.regulationWins
      }
      return possiblePts < wc2.points
    }

    const isEliminated = (team, division) =>
      team.clinchIndicator
        ? false
        : divisionEliminated(team, division) &&
          wildCardEliminated(team, division)

    axios.get(`${API_URL}/standings/byDivision`).then((res) => {
      const data = res.data.records.map((division) => ({
        ...division,
        teamRecords: division.teamRecords.map((record) => ({
          ...record,
          team: teams.find((t) => t.id === record.team.id), // merge additional team data
          possiblePts: record.points + (82 - record.gamesPlayed) * 2,
          eliminated: isEliminated(record, division),
        })),
      }))
      setStandings(data)
    })
  }, [teams, wildCard])

  return (
    <>
      <Box sx={backgroundStyles}>
        <NHL />
      </Box>
      <Box sx={{ height: '8vh' }}>
        <Title order={1}>NHL Standings</Title>
      </Box>
      <Tabs>
        <Tabs.Tab label='Wildcard'>
          <Wildcard options={conferences} standings={standings} />
        </Tabs.Tab>
        <Tabs.Tab label='Division'>
          <Division options={divisions} standings={standings} />
        </Tabs.Tab>
        <Tabs.Tab label='Conference'>
          <Conference options={conferences} standings={standings} />
        </Tabs.Tab>
        <Tabs.Tab label='League'>
          <League standings={standings} />
        </Tabs.Tab>
        <Tabs.Tab label='Wins above avg'>
          <WinsAboveAvg
            options={divisions}
            dates={games}
            teams={teams}
            standings={standings}
          />
        </Tabs.Tab>
        <Tabs.Tab label='Playoff Picture'>
          <Playoffs standings={standings} />
        </Tabs.Tab>
        <Tabs.Tab label='Stats'>
          <Stats standings={standings} />
        </Tabs.Tab>
      </Tabs>
    </>
  )
}

export default App
