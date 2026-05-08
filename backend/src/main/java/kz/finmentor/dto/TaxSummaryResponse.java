package kz.finmentor.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class TaxSummaryResponse {
    private double grossIncome;
    private double taxIpn;
    private double taxOpv;
    private double totalTax;
    private double netIncome;
    private LocalDate deadline;
    private String employmentTypeLabel;
    private String taxBreakdown;
}
