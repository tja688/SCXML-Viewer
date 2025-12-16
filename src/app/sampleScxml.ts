export const SAMPLE_SCXML = `<scxml initial="Authentication" name="Demo" xmlns="http://www.w3.org/2005/07/scxml">
  <state id="Authentication" initial="Login">
    <state id="Login">
      <transition event="success" target="Dashboard" />
      <transition event="failure" target="Locked" cond="retry &lt; 3" />
    </state>
    <state id="Locked">
      <transition event="reset" target="Login" />
    </state>
    <final id="AuthComplete" />
    <transition event="cancel" target="Goodbye" />
  </state>

  <parallel id="Dashboard">
    <state id="Metrics">
      <initial>
        <transition target="Summary" />
      </initial>
      <state id="Summary" />
      <state id="Detail" />
      <transition event="openDetail" target="Detail" />
    </state>
    <state id="Notifications">
      <state id="Idle">
        <transition event="new" target="Busy" />
      </state>
      <state id="Busy">
        <transition event="clear" target="Idle" />
      </state>
    </state>
  </parallel>

  <state id="Goodbye">
    <final id="Done" />
  </state>
</scxml>`
