package com.lantanagroup.nandina;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.rest.client.api.IGenericClient;
import com.lantanagroup.nandina.query.fhir.r4.cerner.filter.Filter;
import com.lantanagroup.nandina.query.fhir.r4.cerner.report.HospitalizedReport;
import com.lantanagroup.nandina.query.fhir.r4.cerner.scoop.EncounterScoop;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;

public class PillboxDemo {

  public static void main(String[] args) {
    try {
      FhirContext ctx = FhirContext.forR4();
      // Same FHIR server for nandina and EHR for demo purposes
      IGenericClient ehrFhirServer = ctx.newRestfulGenericClient("http://hapi.fhir.org/baseR4");
      IGenericClient nandinaFhirServer = ctx.newRestfulGenericClient("http://hapi.fhir.org/baseR4");
      SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
      // The Scoop will look on the nandinaFhirServer for a NandinaEncounterList where List.date is May 4, 2020, then start pulling Encounter data from the EHR with the encounter ids in the List
      EncounterScoop scoop = new EncounterScoop(ehrFhirServer, nandinaFhirServer, sdf.parse("2020-05-04"));
      // You can add additional filters to pass to the report. For example, try creating an EncounterDateFilter for a different day and watch the count change.
      List<Filter> filters = new ArrayList<Filter>();
      HospitalizedReport hr = new HospitalizedReport(scoop, filters);
      System.out.println("Patients hospitalized with Covid on report date: " + hr.getReportCount());
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}